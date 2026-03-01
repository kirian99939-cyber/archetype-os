import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { addCredits } from '@/lib/supabase';

const PRODAMUS_SECRET = process.env.PRODAMUS_SECRET_KEY || '';

/** Маппинг суммы оплаты → количество кредитов */
const PRICE_TO_CREDITS: Record<number, number> = {
  1990: 400,     // Старт
  6990: 1500,    // Про
  12990: 3000,   // Бизнес
};

/**
 * Проверка подписи webhook от Prodamus
 * Подпись передаётся в заголовке Sign — HMAC-SHA256
 */
function verifySignature(data: Record<string, string>, signature: string): boolean {
  if (!PRODAMUS_SECRET) {
    console.error('[prodamus-webhook] PRODAMUS_SECRET_KEY not configured!');
    return false;
  }

  const sorted = Object.keys(data)
    .filter(key => key !== 'sign')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&');

  const hmac = crypto.createHmac('sha256', PRODAMUS_SECRET);
  hmac.update(sorted);
  const calculated = hmac.digest('hex');

  console.log('[prodamus-webhook] Signature check:', {
    expected: calculated.substring(0, 16) + '...',
    received: signature.substring(0, 16) + '...',
    match: calculated === signature,
  });

  return calculated === signature;
}

/** Парсит сумму из строки, убирая пробелы и запятые */
function parseSum(raw: string | undefined): number {
  if (!raw) return 0;
  // "1 990.00" → "1990.00" → 1990
  const cleaned = raw.replace(/[\s,]/g, '');
  return Math.round(parseFloat(cleaned) || 0);
}

/**
 * Извлекает плоский Record<string, string> из тела запроса.
 * Поддерживает: application/json, application/x-www-form-urlencoded, multipart/form-data.
 */
async function parseBody(req: NextRequest): Promise<{ data: Record<string, string>; rawBody: string }> {
  const contentType = req.headers.get('content-type') || '';

  // Читаем raw body для логирования
  const cloned = req.clone();
  const rawBody = await cloned.text();

  // Пробуем JSON
  if (contentType.includes('application/json')) {
    try {
      const json = JSON.parse(rawBody);
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(json)) {
        flat[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
      return { data: flat, rawBody };
    } catch {
      console.error('[prodamus-webhook] Failed to parse JSON body');
    }
  }

  // Пробуем form-data / url-encoded
  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });
    return { data, rawBody };
  } catch {
    console.error('[prodamus-webhook] Failed to parse formData, falling back to URLSearchParams');
  }

  // Fallback: ручной парсинг url-encoded
  try {
    const params = new URLSearchParams(rawBody);
    const data: Record<string, string> = {};
    params.forEach((value, key) => {
      data[key] = value;
    });
    return { data, rawBody };
  } catch {
    console.error('[prodamus-webhook] All parsing methods failed');
  }

  return { data: {}, rawBody };
}

export async function POST(req: NextRequest) {
  console.log('=== PRODAMUS WEBHOOK RECEIVED ===');
  console.log('[prodamus-webhook] Method:', req.method);
  console.log('[prodamus-webhook] Content-Type:', req.headers.get('content-type'));
  console.log('[prodamus-webhook] Sign header:', req.headers.get('Sign') ? 'present' : 'missing');

  try {
    const { data, rawBody } = await parseBody(req);

    console.log('[prodamus-webhook] Raw body (first 500 chars):', rawBody.substring(0, 500));
    console.log('[prodamus-webhook] Parsed keys:', Object.keys(data).join(', '));
    console.log('[prodamus-webhook] Parsed data:', JSON.stringify({
      order_id: data['order_id'],
      sum: data['sum'],
      payment_amount: data['payment_amount'],
      customer_email: data['customer_email'],
      customer_phone: data['customer_phone'],
      payment_status: data['payment_status'],
      date: data['date'],
      sign: data['sign'] ? 'present' : 'missing',
    }));

    // Получаем подпись из заголовка или из тела
    const signature = req.headers.get('Sign') || data['sign'] || '';

    if (!signature) {
      console.error('[prodamus-webhook] No signature found in header or body');
      return NextResponse.json({ success: false, error: 'No signature' }, { status: 200 });
    }

    // Проверяем подпись
    const signatureValid = verifySignature(data, signature);
    console.log('[prodamus-webhook] Signature valid:', signatureValid);

    if (!signatureValid) {
      console.error('[prodamus-webhook] Invalid signature — check PRODAMUS_SECRET_KEY in Vercel env');
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 200 });
    }

    // Проверяем статус платежа
    const paymentStatus = data['payment_status'] || '';
    console.log('[prodamus-webhook] Payment status:', paymentStatus);

    if (paymentStatus && paymentStatus !== 'success') {
      console.log(`[prodamus-webhook] Skipping non-success payment status: ${paymentStatus}`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Payment status: ${paymentStatus}`,
      }, { status: 200 });
    }

    const orderId = data['order_id'] || '';
    const sum = parseSum(data['sum'] || data['payment_amount'] || data['order_sum']);
    const customerEmail = data['customer_email'] || '';
    const customerPhone = data['customer_phone'] || '';
    const paymentDate = data['date'] || '';

    console.log('[prodamus-webhook] Payment confirmed:', {
      orderId,
      sum,
      customerEmail,
      customerPhone,
      date: paymentDate,
    });

    // Определяем количество кредитов по сумме
    const credits = PRICE_TO_CREDITS[sum];
    console.log('[prodamus-webhook] Credits lookup:', { sum, credits: credits ?? 'NOT FOUND', availableSums: Object.keys(PRICE_TO_CREDITS) });

    if (!credits) {
      console.error(`[prodamus-webhook] Unknown payment sum: ${sum}. Raw sum values: sum=${data['sum']}, payment_amount=${data['payment_amount']}, order_sum=${data['order_sum']}`);
      return NextResponse.json({
        success: true,
        warning: `Unknown sum ${sum}, no credits added`,
      }, { status: 200 });
    }

    if (!customerEmail) {
      console.error('[prodamus-webhook] No customer_email in payment data. All fields:', Object.keys(data).join(', '));
      return NextResponse.json({
        success: true,
        warning: 'No customer email, cannot add credits',
      }, { status: 200 });
    }

    // Начисляем кредиты
    console.log(`[prodamus-webhook] Adding ${credits} credits to ${customerEmail}...`);
    const credited = await addCredits(customerEmail, credits);

    if (credited) {
      console.log(`[prodamus-webhook] SUCCESS: +${credits} credits for ${customerEmail} (order ${orderId}, sum ${sum})`);
    } else {
      console.error(`[prodamus-webhook] FAILED to add ${credits} credits for ${customerEmail}. User might not exist in DB or optimistic lock failed.`);
    }

    console.log('=== PRODAMUS WEBHOOK COMPLETE ===');

    return NextResponse.json({
      success: true,
      credited,
      credits,
      email: customerEmail,
    }, { status: 200 });
  } catch (error) {
    console.error('[prodamus-webhook] UNHANDLED ERROR:', error);
    console.error('[prodamus-webhook] Stack:', error instanceof Error ? error.stack : 'no stack');
    console.log('=== PRODAMUS WEBHOOK FAILED ===');
    return NextResponse.json({ success: false, error: String(error) }, { status: 200 });
  }
}

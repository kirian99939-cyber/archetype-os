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

  console.log('[prodamus-webhook] Signature debug:', {
    sortedString: sorted.substring(0, 200) + '...',
    expected: calculated.substring(0, 16) + '...',
    received: signature.substring(0, 16) + '...',
    match: calculated === signature,
  });

  return calculated === signature;
}

/** Парсит сумму из строки, убирая пробелы и запятые */
function parseSum(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[\s,]/g, '');
  return Math.round(parseFloat(cleaned) || 0);
}

export async function POST(req: NextRequest) {
  console.log('=== PRODAMUS WEBHOOK RECEIVED ===');

  // ─── 1. Логируем ВСЕ заголовки ─────────────────────────────────────────────
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = key.toLowerCase().includes('auth') ? '***' : value;
  });
  console.log('[prodamus-webhook] ALL HEADERS:', JSON.stringify(headers));
  console.log('[prodamus-webhook] Content-Type:', req.headers.get('content-type'));
  console.log('[prodamus-webhook] PRODAMUS_SECRET_KEY exists:', !!PRODAMUS_SECRET);
  console.log('[prodamus-webhook] PRODAMUS_SECRET_KEY length:', PRODAMUS_SECRET.length);
  console.log('[prodamus-webhook] PRODAMUS_SECRET_KEY first 8 chars:', PRODAMUS_SECRET.substring(0, 8));

  try {
    // ─── 2. Читаем raw body ────────────────────────────────────────────────────
    const rawBody = await req.text();
    console.log('[prodamus-webhook] RAW BODY (first 1000 chars):', rawBody.substring(0, 1000));
    console.log('[prodamus-webhook] RAW BODY length:', rawBody.length);

    // ─── 3. Парсим тело ────────────────────────────────────────────────────────
    const contentType = req.headers.get('content-type') || '';
    let data: Record<string, string> = {};

    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(rawBody);
        for (const [k, v] of Object.entries(json)) {
          data[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
        console.log('[prodamus-webhook] Parsed as JSON, keys:', Object.keys(data).join(', '));
      } catch (e) {
        console.error('[prodamus-webhook] JSON parse failed:', e);
      }
    } else {
      // form-urlencoded или multipart
      try {
        const params = new URLSearchParams(rawBody);
        params.forEach((value, key) => {
          data[key] = value;
        });
        console.log('[prodamus-webhook] Parsed as URLSearchParams, keys:', Object.keys(data).join(', '));
      } catch (e) {
        console.error('[prodamus-webhook] URLSearchParams parse failed:', e);
      }
    }

    console.log('[prodamus-webhook] Parsed data:', JSON.stringify({
      order_id: data['order_id'],
      sum: data['sum'],
      payment_amount: data['payment_amount'],
      order_sum: data['order_sum'],
      customer_email: data['customer_email'],
      customer_phone: data['customer_phone'],
      payment_status: data['payment_status'],
      date: data['date'],
      sign_in_body: data['sign'] ? `present (${data['sign'].substring(0, 16)}...)` : 'missing',
    }));

    // ─── 4. Ищем подпись во ВСЕХ возможных местах ──────────────────────────────
    // Prodamus может слать в заголовке Sign, sign, Signature, или в теле как sign
    const signHeader = req.headers.get('Sign')
      || req.headers.get('sign')
      || req.headers.get('Signature')
      || req.headers.get('signature')
      || '';
    const signBody = data['sign'] || '';
    const signature = signHeader || signBody;

    console.log('[prodamus-webhook] Sign header:', signHeader ? `found (${signHeader.substring(0, 16)}...)` : 'NOT FOUND');
    console.log('[prodamus-webhook] Sign in body:', signBody ? `found (${signBody.substring(0, 16)}...)` : 'NOT FOUND');
    console.log('[prodamus-webhook] Using signature:', signature ? `${signature.substring(0, 16)}...` : 'NONE');

    // ─── 5. Проверяем подпись (ВРЕМЕННО: bypass если не прошла) ─────────────────
    let signatureValid = false;
    if (signature) {
      signatureValid = verifySignature(data, signature);
    }
    console.log('[prodamus-webhook] Signature valid:', signatureValid);

    if (!signatureValid) {
      console.warn('[prodamus-webhook] ⚠️ SIGNATURE VERIFICATION FAILED — processing anyway (temporary bypass for debugging)');
      // TODO: вернуть блокировку после отладки подписи
      // return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 200 });
    }

    // ─── 6. Проверяем статус платежа ───────────────────────────────────────────
    const paymentStatus = data['payment_status'] || '';
    console.log('[prodamus-webhook] Payment status:', paymentStatus || '(empty)');

    if (paymentStatus && paymentStatus !== 'success') {
      console.log(`[prodamus-webhook] Skipping non-success status: ${paymentStatus}`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Payment status: ${paymentStatus}`,
      }, { status: 200 });
    }

    // ─── 7. Извлекаем данные платежа ───────────────────────────────────────────
    const orderId = data['order_id'] || '';
    const sum = parseSum(data['sum'] || data['payment_amount'] || data['order_sum']);
    const customerEmail = data['customer_email'] || '';
    const customerPhone = data['customer_phone'] || '';
    const paymentDate = data['date'] || '';

    console.log('[prodamus-webhook] Payment:', { orderId, sum, customerEmail, customerPhone, date: paymentDate });

    // ─── 8. Маппим сумму → кредиты ─────────────────────────────────────────────
    const credits = PRICE_TO_CREDITS[sum];
    console.log('[prodamus-webhook] Credits lookup:', { sum, credits: credits ?? 'NOT FOUND', available: Object.keys(PRICE_TO_CREDITS) });

    if (!credits) {
      console.error(`[prodamus-webhook] Unknown sum: ${sum}. Raw: sum=${data['sum']}, payment_amount=${data['payment_amount']}, order_sum=${data['order_sum']}`);
      return NextResponse.json({ success: true, warning: `Unknown sum ${sum}` }, { status: 200 });
    }

    if (!customerEmail) {
      console.error('[prodamus-webhook] No customer_email! All keys:', Object.keys(data).join(', '));
      return NextResponse.json({ success: true, warning: 'No email' }, { status: 200 });
    }

    // ─── 9. Начисляем кредиты ──────────────────────────────────────────────────
    console.log(`[prodamus-webhook] Adding ${credits} credits to ${customerEmail}...`);
    const credited = await addCredits(customerEmail, credits);

    if (credited) {
      console.log(`[prodamus-webhook] ✅ SUCCESS: +${credits} credits for ${customerEmail} (order ${orderId}, sum ${sum})`);
    } else {
      console.error(`[prodamus-webhook] ❌ FAILED to add credits for ${customerEmail}. User not in DB or lock conflict.`);
    }

    console.log('=== PRODAMUS WEBHOOK COMPLETE ===');

    return NextResponse.json({
      success: true,
      credited,
      credits,
      email: customerEmail,
      signatureValid,
    }, { status: 200 });
  } catch (error) {
    console.error('[prodamus-webhook] UNHANDLED ERROR:', error);
    console.error('[prodamus-webhook] Stack:', error instanceof Error ? error.stack : 'no stack');
    console.log('=== PRODAMUS WEBHOOK FAILED ===');
    return NextResponse.json({ success: false, error: String(error) }, { status: 200 });
  }
}

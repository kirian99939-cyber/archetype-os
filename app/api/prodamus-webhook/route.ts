import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { addCredits } from '@/lib/supabase';

const PRODAMUS_SECRET = process.env.PRODAMUS_SECRET_KEY!;

/** Маппинг суммы оплаты → количество кредитов */
const PRICE_TO_CREDITS: Record<number, number> = {
  1490: 5,    // Старт
  4990: 20,   // Про
  9990: 50,   // Бизнес
};

/**
 * Проверка подписи webhook от Prodamus
 * Подпись передаётся в заголовке Sign — HMAC-SHA256
 */
function verifySignature(data: Record<string, string>, signature: string): boolean {
  const sorted = Object.keys(data)
    .filter(key => key !== 'sign')
    .sort()
    .map(key => `${key}=${data[key]}`)
    .join('&');

  const hmac = crypto.createHmac('sha256', PRODAMUS_SECRET);
  hmac.update(sorted);
  const calculated = hmac.digest('hex');

  return calculated === signature;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};

    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    // Получаем подпись из заголовка или из тела
    const signature = req.headers.get('Sign') || data['sign'] || '';

    // Проверяем подпись
    if (!verifySignature(data, signature)) {
      console.error('[prodamus-webhook] Invalid signature');
      // Возвращаем 200 чтобы Prodamus не ретраил
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 200 });
    }

    const orderId = data['order_id'] || '';
    const sum = parseFloat(data['sum'] || data['payment_amount'] || '0');
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

    if (!credits) {
      console.error(`[prodamus-webhook] Unknown payment sum: ${sum}. No credits mapping found.`);
      return NextResponse.json({
        success: true,
        warning: `Unknown sum ${sum}, no credits added`,
      }, { status: 200 });
    }

    if (!customerEmail) {
      console.error('[prodamus-webhook] No customer_email in payment data');
      return NextResponse.json({
        success: true,
        warning: 'No customer email, cannot add credits',
      }, { status: 200 });
    }

    // Начисляем кредиты
    const credited = await addCredits(customerEmail, credits);

    if (credited) {
      console.log(`[prodamus-webhook] +${credits} credits for ${customerEmail} (order ${orderId}, sum ${sum})`);
    } else {
      console.error(`[prodamus-webhook] Failed to add ${credits} credits for ${customerEmail}`);
    }

    // Prodamus ожидает HTTP 200 как подтверждение получения
    return NextResponse.json({
      success: true,
      credited,
      credits,
      email: customerEmail,
    }, { status: 200 });
  } catch (error) {
    console.error('[prodamus-webhook] Error:', error);
    // Всегда 200 чтобы Prodamus не ретраил
    return NextResponse.json({ success: false, error: String(error) }, { status: 200 });
  }
}

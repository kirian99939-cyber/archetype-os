import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Секретный ключ из личного кабинета Prodamus → Настройки
const PRODAMUS_SECRET = process.env.PRODAMUS_SECRET_KEY!;

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
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Оплата подтверждена!
    console.log('[prodamus-webhook] Payment confirmed:', {
      orderId: data['order_id'],
      sum: data['sum'],
      customerEmail: data['customer_email'],
      customerPhone: data['customer_phone'],
      date: data['date'],
    });

    // TODO: Здесь логика после успешной оплаты:
    // - Обновить статус пользователя в БД
    // - Выдать доступ к платным функциям
    // - Отправить email с подтверждением

    // Prodamus ожидает HTTP 200 как подтверждение получения
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[prodamus-webhook] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { addCredits } from '@/lib/supabase';

const ADMIN_EMAILS = ['kirian99939@gmail.com'];

/**
 * POST /api/admin/add-credits
 * Ручное начисление кредитов (только для админов).
 *
 * Body: { email: string, credits: number, reason?: string }
 */
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.email || !ADMIN_EMAILS.includes(token.email as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { email, credits, reason } = body as { email?: string; credits?: number; reason?: string };

  if (!email || !credits || credits <= 0) {
    return NextResponse.json({ error: 'Invalid params. Required: email (string), credits (number > 0)' }, { status: 400 });
  }

  console.log(`[admin/add-credits] Admin ${token.email} adding ${credits} credits to ${email}. Reason: ${reason || 'not specified'}`);

  const ok = await addCredits(email, credits);

  if (!ok) {
    console.error(`[admin/add-credits] Failed to add credits to ${email}`);
    return NextResponse.json({ error: `User ${email} not found or update failed` }, { status: 404 });
  }

  console.log(`[admin/add-credits] SUCCESS: +${credits} credits for ${email}`);
  return NextResponse.json({ success: true, email, credits, reason });
}

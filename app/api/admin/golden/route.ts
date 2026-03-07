import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'kirian99939@gmail.com';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: goldens } = await supabaseAdmin
    .from('users')
    .select('id, email, name, referral_code, created_at')
    .eq('is_golden', true);

  const result = await Promise.all((goldens ?? []).map(async (u) => {
    const { data: earnings } = await supabaseAdmin
      .from('referral_earnings')
      .select('commission, paid_out, referred_user_email, payment_amount, created_at, id')
      .eq('golden_user_id', u.id)
      .order('created_at', { ascending: false });

    const list = earnings ?? [];
    const totalEarned = list.reduce((s, e) => s + e.commission, 0);
    const pending = list.filter(e => !e.paid_out).reduce((s, e) => s + e.commission, 0);
    const referralsCount = new Set(list.map(e => e.referred_user_email)).size;

    return { ...u, earnings: list, totalEarned, pending, referralsCount };
  }));

  return NextResponse.json({ goldens: result });
}

// Отметить выплату как оплаченную
export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { earningId } = await req.json();
  const { error } = await supabaseAdmin
    .from('referral_earnings')
    .update({ paid_out: true })
    .eq('id', earningId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Назначить золотой статус пользователю
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token?.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, referralCode } = await req.json();

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('is_golden', true);

  if ((existing?.length ?? 0) >= 10) {
    return NextResponse.json({ error: 'Лимит 10 золотых кабинетов достигнут' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ is_golden: true, referral_code: referralCode })
    .eq('email', email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

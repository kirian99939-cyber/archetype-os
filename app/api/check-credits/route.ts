import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase';

/** GET /api/check-credits — текущий баланс кредитов авторизованного пользователя */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('credits')
    .eq('email', token.email)
    .maybeSingle();

  return NextResponse.json({ credits: data?.credits ?? 0 });
}

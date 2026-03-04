import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin, getGoldenProfile } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Сначала найдём userId по email
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', token.email)
    .maybeSingle();

  if (!user) return NextResponse.json({ error: 'Not a golden account', isGolden: false }, { status: 403 });

  const profile = await getGoldenProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'Not a golden account', isGolden: false }, { status: 403 });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://archetype-os-tau.vercel.app';
  const referralLink = `${baseUrl}/?ref=${profile.referral_code}`;

  return NextResponse.json({ ...profile, referralLink, isGolden: true });
}

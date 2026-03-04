import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getGoldenProfile } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getGoldenProfile(token.sub);
  if (!profile) return NextResponse.json({ error: 'Not a golden account', isGolden: false }, { status: 403 });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://archetype-os-tau.vercel.app';
  const referralLink = `${baseUrl}/?ref=${profile.referral_code}`;

  return NextResponse.json({ ...profile, referralLink, isGolden: true });
}

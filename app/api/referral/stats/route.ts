import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const MILESTONES = [
  { count: 5, bonus: 300, label: '5 рефералов' },
  { count: 15, bonus: 1000, label: 'Амбассадор' },
  { count: 30, bonus: 2000, label: 'Легенда' },
];

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получить пользователя с referral_code
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, referral_code')
      .eq('email', token.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Если referral_code ещё не сгенерирован — создать
    let referralCode = user.referral_code;
    if (!referralCode) {
      referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      await supabaseAdmin
        .from('users')
        .update({ referral_code: referralCode })
        .eq('id', user.id);
    }

    // Получить рефералов
    const { data: referrals } = await supabaseAdmin
      .from('referrals')
      .select('referred_email, credits_given_referrer, created_at')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    const referralsList = referrals ?? [];
    const totalReferrals = referralsList.length;

    // Получить достигнутые milestones
    const { data: claimedMilestones } = await supabaseAdmin
      .from('referral_milestones')
      .select('milestone, bonus_credits')
      .eq('user_id', user.id);

    const claimedSet = new Set((claimedMilestones ?? []).map(m => m.milestone));
    const milestoneBonusTotal = (claimedMilestones ?? []).reduce((sum, m) => sum + m.bonus_credits, 0);

    const totalCreditsEarned = totalReferrals * 100 + milestoneBonusTotal;

    // Формируем milestones
    const milestones = MILESTONES.map(m => ({
      count: m.count,
      bonus: m.bonus,
      label: m.label,
      reached: totalReferrals >= m.count,
      claimed: claimedSet.has(m.count),
    }));

    // Следующий milestone
    const nextMilestone = MILESTONES.find(m => totalReferrals < m.count);

    return NextResponse.json({
      referralCode,
      referralLink: `https://archetype-os-tau.vercel.app?ref=${referralCode}`,
      totalReferrals,
      totalCreditsEarned,
      referrals: referralsList.map(r => ({
        email: maskEmail(r.referred_email),
        date: new Date(r.created_at).toISOString().split('T')[0],
        creditsEarned: r.credits_given_referrer,
      })),
      milestones,
      nextMilestone: nextMilestone
        ? { count: nextMilestone.count, bonus: nextMilestone.bonus, remaining: nextMilestone.count - totalReferrals }
        : null,
    });
  } catch (error) {
    console.error('[referral/stats] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

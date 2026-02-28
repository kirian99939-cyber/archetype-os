import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { supabaseAdmin, spendCredits } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Ищем пользователя
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, credits')
      .eq('email', token.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.credits < amount) {
      return NextResponse.json(
        { error: 'NO_CREDITS', required: amount, available: user.credits },
        { status: 402 },
      );
    }

    const spent = await spendCredits(user.id, amount);
    if (!spent) {
      return NextResponse.json(
        { error: 'NO_CREDITS', required: amount, available: user.credits },
        { status: 402 },
      );
    }

    console.log(`[spend-credits] Spent ${amount} credits for user ${user.id}. Was: ${user.credits}, now: ${user.credits - amount}`);

    return NextResponse.json({ success: true, spent: amount, remaining: user.credits - amount });
  } catch (error) {
    console.error('[spend-credits] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

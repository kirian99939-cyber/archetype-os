import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin, addCredits } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: { strategy: 'jwt' },

  pages: {
    signIn: '/landing',
  },

  callbacks: {
    /**
     * Запускается при каждом входе.
     * Создаёт запись в public.users если пользователь логинится впервые.
     */
    async signIn({ user, account }) {
      console.log('[NextAuth] signIn callback triggered', {
        email: user.email,
        name: user.name,
        provider: account?.provider,
      });

      if (!user.email) {
        console.error('[NextAuth] signIn: no email in user object, aborting');
        return false;
      }

      try {
        // Проверяем — есть ли уже такой пользователь
        const { data: existing, error: selectError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();

        if (selectError) {
          console.error('[NextAuth] signIn: SELECT error', selectError);
          // Не блокируем вход — просто не создаём запись
          return true;
        }

        console.log('[NextAuth] signIn: existing user lookup result:', existing);

        if (!existing) {
          // Генерируем уникальный referral_code
          const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

          // Читаем реферальный код из cookie (если пришли по ссылке)
          let referredBy: string | null = null;
          try {
            const cookieStore = await cookies();
            referredBy = cookieStore.get('referral_code')?.value ?? null;
          } catch {}

          // Создаём нового пользователя
          const { data: inserted, error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
              email: user.email,
              name:  user.name  ?? null,
              avatar_url: user.image ?? null,
              credits: 100,
              referral_code: referralCode,
              referred_by: referredBy,
            })
            .select('id, credits')
            .single();

          if (insertError) {
            console.error('[NextAuth] signIn: INSERT error', insertError);
          } else {
            console.log('[NextAuth] signIn: new user created', inserted);

            // Обрабатываем реферальный бонус
            if (referredBy && inserted) {
              try {
                await processReferral(referredBy, inserted.id, user.email);
              } catch (err) {
                console.error('[NextAuth] signIn: referral processing error', err);
              }
            }
          }
        } else {
          console.log('[NextAuth] signIn: existing user, skipping insert');
        }
      } catch (err) {
        console.error('[NextAuth] signIn: unexpected error', err);
      }

      return true;
    },

    /**
     * Добавляет id и credits из Supabase в сессию при каждом запросе.
     */
    async session({ session }) {
      if (!session.user?.email) return session;

      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('id, credits')
          .eq('email', session.user.email)
          .single();

        if (error) {
          console.error('[NextAuth] session: SELECT error', error);
          return session;
        }

        if (data) {
          session.user.id      = data.id;
          session.user.credits = data.credits;
        }
      } catch (err) {
        console.error('[NextAuth] session: unexpected error', err);
      }

      return session;
    },
  },
};

// ─── Referral processing ─────────────────────────────────────────────────────

const MILESTONES = [
  { count: 5, bonus: 300 },
  { count: 15, bonus: 1000 },
  { count: 30, bonus: 2000 },
];

async function processReferral(referralCode: string, newUserId: string, newUserEmail: string) {
  // Найти пригласившего по referral_code
  const { data: referrer } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('referral_code', referralCode)
    .single();

  if (!referrer) {
    console.log('[Referral] referral_code not found:', referralCode);
    return;
  }

  // Нельзя пригласить самого себя
  if (referrer.id === newUserId) return;

  // Проверить дубликат
  const { data: existing } = await supabaseAdmin
    .from('referrals')
    .select('id')
    .eq('referred_id', newUserId)
    .maybeSingle();

  if (existing) return;

  // Создать запись реферала
  await supabaseAdmin.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: newUserId,
    referred_email: newUserEmail,
    credits_given_referrer: 100,
    credits_given_referred: 100,
  });

  // Начислить бонусы: 100 пригласившему, 100 приглашённому
  await addCredits(referrer.email, 100);
  await addCredits(newUserEmail, 100);
  console.log(`[Referral] +100 credits to referrer ${referrer.email} and referred ${newUserEmail}`);

  // Проверить milestone-бонусы
  const { count } = await supabaseAdmin
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrer.id);

  const totalReferrals = count ?? 0;

  for (const milestone of MILESTONES) {
    if (totalReferrals >= milestone.count) {
      // Проверяем, не начислен ли уже
      const { data: claimed } = await supabaseAdmin
        .from('referral_milestones')
        .select('id')
        .eq('user_id', referrer.id)
        .eq('milestone', milestone.count)
        .maybeSingle();

      if (!claimed) {
        await supabaseAdmin.from('referral_milestones').insert({
          user_id: referrer.id,
          milestone: milestone.count,
          bonus_credits: milestone.bonus,
        });
        await addCredits(referrer.email, milestone.bonus);
        console.log(`[Referral] Milestone ${milestone.count} reached for ${referrer.email}: +${milestone.bonus} credits`);
      }
    }
  }
}

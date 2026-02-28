import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/supabase';

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
          // Создаём нового пользователя
          // Реальная схема таблицы: id, email, name, avatar_url, credits, created_at
          const { data: inserted, error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
              email: user.email,
              name:  user.name  ?? null,
              avatar_url: user.image ?? null,
              credits: 30,
            })
            .select('id, credits')
            .single();

          if (insertError) {
            console.error('[NextAuth] signIn: INSERT error', insertError);
          } else {
            console.log('[NextAuth] signIn: new user created', inserted);
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

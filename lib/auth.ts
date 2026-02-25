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
     * Runs on every sign-in.
     * Creates a new user row in Supabase with 10 credits if first time.
     */
    async signIn({ user }) {
      try {
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', user.email!)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin.from('users').insert({
            email: user.email,
            name: user.name,
            image: user.image,
            credits: 10,
          });
        }
      } catch (err) {
        console.error('[NextAuth] Supabase signIn error:', err);
      }
      return true;
    },

    /**
     * Attaches credits (and Supabase user id) to the session on every request.
     */
    async session({ session }) {
      if (session.user?.email) {
        try {
          const { data } = await supabaseAdmin
            .from('users')
            .select('id, credits')
            .eq('email', session.user.email)
            .single();

          if (data) {
            session.user.id = data.id;
            session.user.credits = data.credits;
          }
        } catch (err) {
          console.error('[NextAuth] Supabase session error:', err);
        }
      }
      return session;
    },
  },
};

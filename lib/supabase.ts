import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

/**
 * Server-side admin client (uses secret key).
 * Only import this in server-side code (API routes, server components, NextAuth callbacks).
 *
 * Expected Supabase table schema:
 *
 *   Реальная схема таблицы public.users в Supabase:
 *
 *   id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY
 *   email       TEXT        UNIQUE NOT NULL
 *   name        TEXT
 *   avatar_url  TEXT        ← колонка называется avatar_url, не image!
 *   credits     INTEGER     DEFAULT 3
 *   created_at  TIMESTAMPTZ DEFAULT NOW()
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

/** Возвращает текущий баланс кредитов пользователя. */
export async function getCredits(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('[Supabase] getCredits error:', error);
    return 0;
  }
  return data.credits ?? 0;
}

/**
 * Списывает 1 кредит у пользователя.
 * Возвращает true если списание прошло успешно, false если кредитов нет или ошибка.
 */
export async function spendCredit(userId: string): Promise<boolean> {
  // Читаем текущий баланс
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error || !data || data.credits <= 0) return false;

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ credits: data.credits - 1 })
    .eq('id', userId);

  if (updateError) {
    console.error('[Supabase] spendCredit error:', updateError);
    return false;
  }
  return true;
}

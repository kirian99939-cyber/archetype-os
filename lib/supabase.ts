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
 *   credits     INTEGER     DEFAULT 100
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
 * Списывает указанное количество кредитов у пользователя.
 * Возвращает true если списание прошло успешно, false если кредитов недостаточно или ошибка.
 */
export async function spendCredits(userId: string, amount: number): Promise<boolean> {
  // Атомарно: читаем текущий баланс и списываем с optimistic lock
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error || !data || data.credits < amount) return false;

  // Optimistic lock: обновляем ТОЛЬКО если credits не изменился с момента чтения
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('users')
    .update({ credits: data.credits - amount })
    .eq('id', userId)
    .eq('credits', data.credits)
    .select('credits')
    .single();

  // Если кто-то параллельно уже списал — .eq('credits', data.credits) не найдёт строку
  if (updateError || !updated) return false;
  return true;
}

/**
 * Начисляет кредиты пользователю по email.
 * Использует оптимистичный lock для атомарности.
 */
export async function addCredits(email: string, amount: number): Promise<boolean> {
  const { data: user, error: findError } = await supabaseAdmin
    .from('users')
    .select('id, credits')
    .eq('email', email)
    .single();

  if (findError || !user) {
    console.error('[Supabase] addCredits: user not found', email, findError);
    return false;
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ credits: user.credits + amount })
    .eq('id', user.id)
    .eq('credits', user.credits); // оптимистичный lock

  if (error) {
    console.error('[Supabase] addCredits: update failed', error);
    return false;
  }

  console.log(`[Supabase] addCredits: +${amount} credits for ${email} (was ${user.credits}, now ${user.credits + amount})`);
  return true;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface ProjectPayload {
  title?:      string;
  brief?:      Record<string, unknown>;
  archetype?:  Record<string, unknown>;
  hypotheses?: unknown[];
  banners?:    unknown[];
  status?:     string;
}

/**
 * Создаёт новый проект или обновляет существующий.
 * Возвращает id проекта, или null при ошибке.
 */
export async function saveProject(
  userId: string,
  data: ProjectPayload,
  existingId?: string,
): Promise<string | null> {
  if (existingId) {
    const { error } = await supabaseAdmin
      .from('projects')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', existingId)
      .eq('user_id', userId);

    if (error) {
      console.error('[Supabase] saveProject update error:', error);
      return null;
    }
    return existingId;
  }

  const { data: row, error } = await supabaseAdmin
    .from('projects')
    .insert({ user_id: userId, ...data })
    .select('id')
    .single();

  if (error) {
    console.error('[Supabase] saveProject insert error:', error);
    return null;
  }
  return row.id;
}

/** Возвращает все проекты пользователя, отсортированные по updated_at. */
export async function getProjects(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, title, status, created_at, updated_at, archetype, banners, banner_history')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Supabase] getProjects error:', error);
    return [];
  }
  return data ?? [];
}

/** Возвращает полный проект по id. */
export async function getProject(projectId: string) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (error) {
    console.error('[Supabase] getProject error:', error);
    return null;
  }
  return data;
}

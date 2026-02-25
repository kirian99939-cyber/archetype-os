import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

/**
 * Server-side admin client (uses secret key).
 * Only import this in server-side code (API routes, server components, NextAuth callbacks).
 *
 * Expected Supabase table schema:
 *
 *   CREATE TABLE users (
 *     id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
 *     email       TEXT        UNIQUE NOT NULL,
 *     name        TEXT,
 *     image       TEXT,
 *     credits     INTEGER     DEFAULT 10,
 *     created_at  TIMESTAMPTZ DEFAULT NOW()
 *   );
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);

-- Golden Cabinets: реферальная система для 5 фиксированных аккаунтов
-- Выполнить в Supabase SQL Editor

-- Добавляем поле is_golden в users (referral_code и referred_by уже есть)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_golden BOOLEAN DEFAULT FALSE;

-- Таблица начислений рефералов (25% комиссия от платежей)
CREATE TABLE IF NOT EXISTS referral_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  golden_user_id UUID NOT NULL REFERENCES users(id),
  referred_user_email TEXT NOT NULL,
  order_id TEXT NOT NULL,
  payment_amount INTEGER NOT NULL,
  commission INTEGER NOT NULL,
  paid_out BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_referral_earnings_golden_user ON referral_earnings(golden_user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_golden ON users(is_golden) WHERE is_golden = TRUE;

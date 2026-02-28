-- Добавить поле referral_code в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT; -- referral_code того, кто пригласил

-- Таблица рефералов
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id TEXT NOT NULL,           -- кто пригласил (user id)
  referred_id TEXT NOT NULL,           -- кого пригласили (user id)
  referred_email TEXT NOT NULL,
  credits_given_referrer INTEGER DEFAULT 100,
  credits_given_referred INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- Таблица milestone-бонусов (чтобы не начислять дважды)
CREATE TABLE IF NOT EXISTS referral_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  milestone INTEGER NOT NULL,          -- 5, 15, или 30
  bonus_credits INTEGER NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, milestone)
);

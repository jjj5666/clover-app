-- subscriptions 表更新：加试用期字段
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  plan TEXT DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  lemon_squeezy_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

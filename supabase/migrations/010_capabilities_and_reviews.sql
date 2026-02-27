-- 用户能力配置表
CREATE TABLE IF NOT EXISTS user_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  capability_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, capability_id)
);

ALTER TABLE user_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own capabilities"
  ON user_capabilities FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_capabilities_user_id ON user_capabilities(user_id);

-- 每日回顾表
CREATE TABLE IF NOT EXISTS daily_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own daily reviews"
  ON daily_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_daily_reviews_user_id ON daily_reviews(user_id);
CREATE INDEX idx_daily_reviews_date ON daily_reviews(date DESC);

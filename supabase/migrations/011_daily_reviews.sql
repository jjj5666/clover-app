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

CREATE POLICY "users can insert own daily reviews"
  ON daily_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can update own daily reviews"
  ON daily_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_daily_reviews_user_date ON daily_reviews(user_id, date DESC);

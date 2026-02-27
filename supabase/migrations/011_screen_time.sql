-- 屏幕时间记录表
CREATE TABLE IF NOT EXISTS screen_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  minutes INT NOT NULL,
  category TEXT,  -- social, work, entertainment, etc.
  app_name TEXT,
  device_type TEXT DEFAULT 'iphone',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, app_name)
);

ALTER TABLE screen_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own screen time logs"
  ON screen_time_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_screen_time_user_date ON screen_time_logs(user_id, date DESC);
CREATE INDEX idx_screen_time_category ON screen_time_logs(category);

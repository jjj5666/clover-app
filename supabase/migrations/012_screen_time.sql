-- 屏幕时间记录表
CREATE TABLE IF NOT EXISTS screen_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  total_minutes INT DEFAULT 0,
  app_usage JSONB DEFAULT '{}'::jsonb,  -- { "微信": 120, "抖音": 60, ... }
  pickups INT DEFAULT 0,  -- 解锁次数
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE screen_time_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own screen time logs"
  ON screen_time_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_screen_time_logs_user_date ON screen_time_logs(user_id, date DESC);

-- API 接收端点（iOS Shortcut 调用）
CREATE TABLE IF NOT EXISTS screen_time_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE screen_time_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own api keys"
  ON screen_time_api_keys FOR ALL
  USING (auth.uid() = user_id);

-- 每日对话摘要表（按日期存储，用于上下文压缩）
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- RLS：只允许用户读写自己的摘要
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own summaries"
  ON daily_summaries FOR ALL
  USING (auth.uid() = user_id);

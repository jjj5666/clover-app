-- 用户画像表（Markdown文本，永久存储）
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  content TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 对话 session 表
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS：只允许用户读写自己的数据
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own memory"
  ON user_memories FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "users can manage own sessions"
  ON sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "users can manage own messages"
  ON messages FOR ALL
  USING (auth.uid() = user_id);

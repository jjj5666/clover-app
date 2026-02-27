-- 用户关系/实体表
CREATE TABLE IF NOT EXISTS user_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'person',
  relation TEXT,
  notes TEXT,
  last_mentioned_at TIMESTAMPTZ,
  mention_count INT DEFAULT 1
);

ALTER TABLE user_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own entities"
  ON user_entities FOR ALL
  USING (auth.uid() = user_id);

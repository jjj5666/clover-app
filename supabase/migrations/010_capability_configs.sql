-- 用户能力配置表
CREATE TABLE IF NOT EXISTS user_capability_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  capability_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,  -- 外部API的配置
  connected BOOLEAN DEFAULT false,     -- 外部服务是否已连接
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, capability_id)
);

ALTER TABLE user_capability_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own capability configs"
  ON user_capability_configs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_capability_configs_user_id ON user_capability_configs(user_id);

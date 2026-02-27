// Builder 数据表
CREATE TABLE IF NOT EXISTS builder_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  description TEXT NOT NULL,
  code TEXT NOT NULL,
  deploy_url TEXT,
  deploy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE builder_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can manage own builder projects"
  ON builder_projects FOR ALL
  USING (auth.uid() = user_id);

-- 创建索引
CREATE INDEX idx_builder_projects_user_id ON builder_projects(user_id);
CREATE INDEX idx_builder_projects_created_at ON builder_projects(created_at DESC);

-- sessions 表加标题列
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS title TEXT;

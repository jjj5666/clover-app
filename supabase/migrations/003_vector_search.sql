-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 给消息表加向量列
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 向量相似度搜索函数
CREATE OR REPLACE FUNCTION search_messages(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  role text,
  content text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.role,
    m.content,
    m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM messages m
  WHERE m.user_id = match_user_id
    AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

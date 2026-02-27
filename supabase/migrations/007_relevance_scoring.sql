-- 为消息表添加热度相关字段
ALTER TABLE messages ADD COLUMN IF NOT EXISTS access_count INT DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ;

-- 更新向量搜索函数，支持热度排序
CREATE OR REPLACE FUNCTION search_messages_with_relevance(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  role text,
  content text,
  created_at timestamptz,
  similarity float,
  relevance_score float
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
    1 - (m.embedding <=> query_embedding) AS similarity,
    -- 相关性分数 = 相似度 × 时间衰减 × 热度因子
    (1 - (m.embedding <=> query_embedding)) 
      * EXP(-EXTRACT(EPOCH FROM (NOW() - m.created_at)) / (30 * 24 * 3600))  -- 30天衰减
      * (1 + LN(1 + COALESCE(m.access_count, 0)) / 5)  -- 热度因子，访问越多权重越高
    AS relevance_score
  FROM messages m
  WHERE m.user_id = match_user_id
    AND m.embedding IS NOT NULL
  ORDER BY relevance_score DESC
  LIMIT match_count;
END;
$$;

-- 函数：增加消息访问计数（用于热度更新）
CREATE OR REPLACE FUNCTION increment_message_access(message_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE messages
  SET 
    access_count = COALESCE(access_count, 0) + 1,
    last_accessed = NOW()
  WHERE id = message_id;
END;
$$;

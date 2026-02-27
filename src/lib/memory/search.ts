// 向量检索：语义搜索历史消息
import { SupabaseClient } from '@supabase/supabase-js'

// 调用 OpenRouter 获取文本的 embedding（5秒超时）
async function getEmbedding(text: string): Promise<number[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: text,
      }),
      signal: controller.signal,
    })
    const data = await res.json()
    return data.data?.[0]?.embedding || []
  } catch {
    return []
  } finally {
    clearTimeout(timeout)
  }
}

// 保存消息时同时生成并存储 embedding
export async function embedMessage(supabase: SupabaseClient, messageId: string, content: string) {
  try {
    const embedding = await getEmbedding(content)
    if (embedding.length > 0) {
      await supabase
        .from('messages')
        .update({ embedding })
        .eq('id', messageId)
    }
  } catch {
    // embedding 失败不影响主流程
  }
}

// 语义搜索历史消息（使用统一相关性分数：相似度 × 时间衰减 × 热度）
export async function searchMessages(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit: number = 5,
  minRelevance: number = 0.6  // 默认最低相关性阈值（用户不提时不注入）
): Promise<{ role: string; content: string; created_at: string; similarity: number; relevance_score: number; id: string }[]> {
  const queryEmbedding = await getEmbedding(query)
  if (queryEmbedding.length === 0) return []

  const { data, error } = await supabase.rpc('search_messages_with_relevance', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: limit,
  })

  if (error) {
    console.error('Vector search error:', error)
    return []
  }

  // 过滤低相关性结果
  const filtered = (data || []).filter((m: any) => m.relevance_score >= minRelevance)
  
  // 异步更新访问计数（增加热度）- 不阻塞主流程
  if (filtered.length > 0) {
    // fire-and-forget，不等待结果
    Promise.allSettled(
      filtered.map((m: any) => 
        supabase.rpc('increment_message_access', { message_id: m.id })
      )
    )
  }

  return filtered
}

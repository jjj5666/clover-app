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

// 语义搜索历史消息
export async function searchMessages(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit: number = 5
): Promise<{ role: string; content: string; created_at: string; similarity: number }[]> {
  const queryEmbedding = await getEmbedding(query)
  if (queryEmbedding.length === 0) return []

  const { data, error } = await supabase.rpc('search_messages', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: limit,
  })

  if (error) {
    console.error('Vector search error:', error)
    return []
  }

  return data || []
}

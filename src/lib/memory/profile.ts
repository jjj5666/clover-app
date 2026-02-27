import type { SupabaseClient } from '@supabase/supabase-js'

// 获取用户画像文本，不存在时返回空字符串
export async function getProfile(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from('user_memories')
    .select('content')
    .eq('user_id', userId)
    .single()

  return data?.content ?? ''
}

// 写入/更新用户画像文本
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  content: string
): Promise<void> {
  await supabase.from('user_memories').upsert(
    { user_id: userId, content, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
}

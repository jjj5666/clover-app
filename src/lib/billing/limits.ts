// 用量限制
import { SupabaseClient } from '@supabase/supabase-js'

// 免费用户每日消息上限
export const FREE_LIMIT = 999  // 开发阶段不限制，上线前改回来

// 获取用户今日已发送消息数
export async function getMessageCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59.999`)

  return count || 0
}

// 检查用户是否超限
export async function checkLimit(supabase: SupabaseClient, userId: string) {
  const used = await getMessageCount(supabase, userId)
  return { allowed: used < FREE_LIMIT, used, limit: FREE_LIMIT }
}

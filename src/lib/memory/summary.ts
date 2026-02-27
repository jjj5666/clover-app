import type { SupabaseClient } from '@supabase/supabase-js'

// 获取最近N天的每日摘要，按日期倒序
export async function getDailySummaries(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<{ date: string; summary: string }[]> {
  const { data } = await supabase
    .from('daily_summaries')
    .select('date, summary')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(days)

  return data ?? []
}

// 写入/更新某天的摘要（同一天重复调用会覆盖）
export async function saveDailySummary(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  summary: string
): Promise<void> {
  await supabase.from('daily_summaries').upsert(
    { user_id: userId, date, summary },
    { onConflict: 'user_id,date' }
  )
}

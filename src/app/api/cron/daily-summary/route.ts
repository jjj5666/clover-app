import { createClient } from '@/lib/supabase/server'
import { getDailySummaries, saveDailySummary } from '@/lib/memory/summary'

// 每日摘要生成（由 cron 调用，处理所有有对话的用户）
export async function POST(req: Request) {
  // 简单的 API key 保护
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = await createClient()
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  // 找出昨天有消息的所有用户
  const { data: users } = await supabase
    .from('messages')
    .select('user_id')
    .gte('created_at', `${yesterday}T00:00:00`)
    .lt('created_at', `${yesterday}T23:59:59.999`)

  if (!users || users.length === 0) {
    return Response.json({ ok: true, processed: 0 })
  }

  // 去重
  const uniqueUserIds = [...new Set(users.map(u => u.user_id))]
  let processed = 0

  for (const userId of uniqueUserIds) {
    // 检查是否已有摘要
    const existing = await getDailySummaries(supabase, userId, 1)
    if (existing.some((s: any) => s.date === yesterday)) continue

    // 获取该用户昨天的所有消息
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('user_id', userId)
      .gte('created_at', `${yesterday}T00:00:00`)
      .lt('created_at', `${yesterday}T23:59:59.999`)
      .order('created_at', { ascending: true })

    if (!messages || messages.length === 0) continue

    // 用 Kimi 生成摘要
    const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n')

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2.5',
          messages: [
            {
              role: 'system',
              content: `从以下对话中提取关键信息：
1. 用户做出的决策
2. 提到的未来计划
3. 重要事件
4. 新偏好或态度变化
每条一行，简洁。500字以内。`,
            },
            { role: 'user', content: conversationText },
          ],
        }),
      })

      const data = await res.json()
      const summary = data.choices?.[0]?.message?.content
      if (summary) {
        await saveDailySummary(supabase, userId, yesterday, summary)
        processed++
      }
    } catch {}
  }

  return Response.json({ ok: true, processed, date: yesterday })
}

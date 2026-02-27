import { createClient } from '@/lib/supabase/server'
import { getDailySummaries, saveDailySummary } from '@/lib/memory/summary'

// 生成每日摘要：读取当天所有消息，调用LLM总结
async function generateSummary(supabase: any, userId: string, date: string): Promise<string> {
  // 查询该日期的所有消息
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .gte('created_at', `${date}T00:00:00`)
    .lt('created_at', `${date}T23:59:59.999`)
    .order('created_at', { ascending: true })

  if (!messages || messages.length === 0) {
    return ''
  }

  // 拼接对话文本
  const conversationText = messages
    .map((m: any) => `${m.role}: ${m.content}`)
    .join('\n')

  // 调用 Kimi Flash 生成摘要（便宜，适合总结任务）
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
          content: `你是一个对话摘要助手。请从以下对话中提取关键信息：
1. 用户做出的决策（最高优先）
2. 提到的未来计划/日程
3. 重要事件或发现
4. 新表达的偏好或态度变化

每条一行，简洁明了。总长度控制在500字以内。`,
        },
        {
          role: 'user',
          content: `以下是${date}的对话记录：\n\n${conversationText}`,
        },
      ],
    }),
  })

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

// POST: 生成指定日期的摘要（默认昨天）
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const date = body.date || new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const summary = await generateSummary(supabase, user.id, date)
  if (!summary) {
    return Response.json({ ok: false, message: 'No messages found for that date' })
  }

  await saveDailySummary(supabase, user.id, date, summary)
  return Response.json({ ok: true, date, summary })
}

// GET: 获取最近几天的摘要
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const summaries = await getDailySummaries(supabase, user.id, 3)
  return Response.json({ summaries })
}

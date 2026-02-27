import { SupabaseClient } from '@supabase/supabase-js'

const COMPRESSION_THRESHOLD = 20  // 超过20轮触发压缩
const KEEP_LAST_ROUNDS = 5        // 保留最后5轮完整对话

interface Message {
  role: string
  content: string
  created_at: string
}

// Session 压缩：长对话压缩为摘要 + 最近完整对话
export async function getCompressedSessionMessages(
  supabase: SupabaseClient,
  sessionId: string,
  apiKey: string
): Promise<{ messages: Message[]; hasCompressed: boolean; summary?: string }> {
  // 获取当前session所有消息
  const { data: allMessages, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error || !allMessages || allMessages.length === 0) {
    return { messages: [], hasCompressed: false }
  }

  // 消息数未超过阈值，直接返回
  if (allMessages.length <= COMPRESSION_THRESHOLD) {
    return { messages: allMessages, hasCompressed: false }
  }

  // 需要压缩：前面部分生成摘要，后面保留完整
  const messagesToCompress = allMessages.slice(0, -KEEP_LAST_ROUNDS * 2)
  const messagesToKeep = allMessages.slice(-KEEP_LAST_ROUNDS * 2)

  // 用 AI 生成前面部分的摘要
  const conversationText = messagesToCompress
    .map((m: any) => `${m.role}: ${m.content}`)
    .join('\n')

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: [
          {
            role: 'system',
            content: '总结以下对话的关键信息（决策、约定、背景）。200字以内，简洁。',
          },
          { role: 'user', content: conversationText },
        ],
      }),
    })

    const data = await res.json()
    const summary = data.choices?.[0]?.message?.content?.trim()

    return {
      messages: messagesToKeep,
      hasCompressed: true,
      summary,
    }
  } catch {
    // 压缩失败，返回原始消息（兜底）
    return { messages: allMessages, hasCompressed: false }
  }
}

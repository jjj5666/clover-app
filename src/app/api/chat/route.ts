import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getProfile, updateProfile } from '@/lib/memory/profile'
import { getDailySummaries } from '@/lib/memory/summary'
import { checkLimit } from '@/lib/billing/limits'
import { getUserPlan } from '@/lib/billing/plans'
import { embedMessage, searchMessages } from '@/lib/memory/search'
import { compressMemory } from '@/lib/memory/observer'

// 异步生成 session 标题
async function generateSessionTitle(supabase: any, sessionId: string, firstMessage: string) {
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
            content: '根据用户的第一条消息，生成一个简短的对话标题（5-10个字）。只返回标题，不要引号或其他内容。',
          },
          { role: 'user', content: firstMessage },
        ],
      }),
    })
    const data = await res.json()
    const title = data.choices?.[0]?.message?.content?.trim()
    if (title) {
      await supabase.from('sessions').update({ title }).eq('id', sessionId)
    }
  } catch {}
}

// 基础系统提示词
const BASE_SYSTEM_PROMPT = `You are Clover, a friendly AI assistant.

Rules:
- Respond naturally in the user's language
- You have background knowledge about the user (provided below). Use it to give relevant responses, but DO NOT proactively mention or recite what you know unless the user asks or it's directly relevant
- Act like a friend who knows the user well — you don't greet someone by listing everything you know about them
- Be concise and natural, not performative`

// 从对话中自动提取信息更新用户画像（后台异步，不阻塞回复）
async function autoExtractMemory(
  supabase: any,
  userId: string,
  userMessage: string,
  assistantResponse: string,
  existingMemory: string
) {
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
            content: `你是一个精准的记忆提取器。从对话中提取值得长期记住的**新信息**。

## 什么值得提取
- 用户的身份信息（姓名、职业、所在地）
- 明确表达的偏好
- 正在做的项目或目标
- 提到的人及其关系
- 重要生活事件

## 什么不提取
- 闲聊、问候
- 一般性知识讨论
- AI的回复内容
- 模糊或一次性的信息

## 输出规则
- 如果没有值得记住的新信息，只返回：NO_UPDATE
- 如果有，只返回新增的条目（每条以 - 开头），不要重复已有的内容
- 如果新信息和已有内容矛盾，返回格式：REPLACE: 旧内容 -> 新内容

已有记忆（不要重复这些）：
${existingMemory || '（空）'}`,
          },
          {
            role: 'user',
            content: `用户说：${userMessage}\n\nAI回复：${assistantResponse}`,
          },
        ],
      }),
    })

    const data = await res.json()
    const extracted = data.choices?.[0]?.message?.content?.trim()

    if (extracted && extracted !== 'NO_UPDATE') {
      let updatedMemory = existingMemory || ''

      // 处理 REPLACE 指令（矛盾更新）
      if (extracted.includes('REPLACE:')) {
        const lines = extracted.split('\n')
        for (const line of lines) {
          const match = line.match(/REPLACE:\s*(.+?)\s*->\s*(.+)/)
          if (match) {
            updatedMemory = updatedMemory.replace(match[1].trim(), match[2].trim())
          }
        }
        // 也处理非REPLACE行作为新增
        const newLines = lines.filter((l: string) => !l.includes('REPLACE:') && l.trim().startsWith('- '))
        if (newLines.length > 0) {
          updatedMemory = updatedMemory.trim() + '\n' + newLines.join('\n')
        }
      } else {
        // 纯新增：追加到已有记忆后面
        updatedMemory = updatedMemory.trim() + '\n' + extracted.trim()
      }

      await updateProfile(supabase, userId, updatedMemory.trim())
    }

    // 同时提取人物关系
    await extractEntities(supabase, userId, userMessage)
  } catch {
    // 提取失败不影响主流程
  }
}

// 从对话中提取人物和关系
async function extractEntities(supabase: any, userId: string, userMessage: string) {
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
            content: `从用户消息中提取提到的人物。只提取明确提到的、与用户有关系的人。

如果没有提到任何人，只返回：NONE

如果有，返回JSON数组，每个元素：
{"name": "人名", "type": "person", "relation": "关系（同事/朋友/家人/伴侣/客户等）"}

只返回JSON或NONE，不要其他内容。`,
          },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    const data = await res.json()
    const result = data.choices?.[0]?.message?.content?.trim()
    if (!result || result === 'NONE') return

    const entities = JSON.parse(result)
    for (const entity of entities) {
      // upsert：存在则更新提及次数，不存在则新建
      const { data: existing } = await supabase
        .from('user_entities')
        .select('id, mention_count')
        .eq('user_id', userId)
        .eq('name', entity.name)
        .single()

      if (existing) {
        await supabase.from('user_entities').update({
          mention_count: existing.mention_count + 1,
          last_mentioned_at: new Date().toISOString(),
          relation: entity.relation,
        }).eq('id', existing.id)
      } else {
        await supabase.from('user_entities').insert({
          user_id: userId,
          name: entity.name,
          type: entity.type,
          relation: entity.relation,
          last_mentioned_at: new Date().toISOString(),
        })
      }
    }
  } catch {
    // 提取失败不影响主流程
  }
}

// 获取或创建今日 session
async function getOrCreateSession(supabase: any, userId: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0]

  // 先查今天有没有session
  const { data: existing } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing?.id) return existing.id

  // 没有则创建
  const { data: newSession, error } = await supabase
    .from('sessions')
    .insert({ user_id: userId })
    .select('id')
    .single()

  if (error || !newSession) {
    console.error('Failed to create session:', error)
    throw new Error('Failed to create session')
  }

  return newSession.id
}

// 保存消息到数据库，异步生成 embedding
async function saveMessage(supabase: any, sessionId: string, userId: string, role: string, content: string) {
  const { data } = await supabase.from('messages').insert({
    session_id: sessionId,
    user_id: userId,
    role,
    content,
  }).select('id').single()

  // 异步生成 embedding，不阻塞
  if (data?.id) {
    embedMessage(supabase, data.id, content)
  }
}

export async function POST(req: NextRequest) {
  // 验证用户是否已登录
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 检查用量限制
  const limitCheck = await checkLimit(supabase, user.id)
  if (!limitCheck.allowed) {
    return new Response(
      JSON.stringify({ error: 'limit_exceeded', used: limitCheck.used, limit: limitCheck.limit }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 解析请求体
  const { messages, sessionId: providedSessionId, newSession: forceNew } = await req.json()

  // 确定 session：客户端指定 > 复用今日 > 创建新的
  let sessionId: string
  if (providedSessionId && !forceNew) {
    sessionId = providedSessionId
  } else {
    // 创建全新 session
    const { data: ns, error } = await supabase
      .from('sessions')
      .insert({ user_id: user.id })
      .select('id')
      .single()
    if (error || !ns) {
      return new Response(JSON.stringify({ error: 'Failed to create session' }), { status: 500 })
    }
    sessionId = ns.id
  }
  const lastUserMsg = messages[messages.length - 1]
  if (lastUserMsg?.role === 'user') {
    await saveMessage(supabase, sessionId, user.id, 'user', lastUserMsg.content)
  }

  // 检查用户计划（试用/免费/Pro）
  const userPlan = await getUserPlan(supabase, user.id)

  // 只有有记忆权限的用户才加载记忆
  const memoryContent = userPlan.hasMemory ? await getProfile(supabase, user.id) : ''
  const summaries = userPlan.hasMemory ? await getDailySummaries(supabase, user.id, 2) : []

  // 加载上一次session的最后几轮（跨session连续性）
  let previousContext = ''
  if (messages.length <= 1) {
    // 新对话的第一条消息，加载上次session的尾巴
    const { data: prevSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2)

    // 取倒数第二个session（当前session是最新的）
    const prevSessionId = prevSessions?.[1]?.id || prevSessions?.[0]?.id
    if (prevSessionId && prevSessionId !== sessionId) {
      const { data: prevMsgs } = await supabase
        .from('messages')
        .select('role, content')
        .eq('session_id', prevSessionId)
        .order('created_at', { ascending: false })
        .limit(6) // 最后3轮（6条消息）

      if (prevMsgs && prevMsgs.length > 0) {
        const reversed = prevMsgs.reverse()
        previousContext = reversed.map((m: any) => `${m.role}: ${m.content}`).join('\n')
      }
    }
  }

  // 加载用户的人际关系
  const { data: entities } = await supabase
    .from('user_entities')
    .select('name, relation, notes')
    .eq('user_id', user.id)
    .order('mention_count', { ascending: false })
    .limit(10)

  // 构造系统提示：基础 + 画像 + 关系 + 摘要 + 上次对话尾巴
  let systemPrompt = BASE_SYSTEM_PROMPT
  if (memoryContent) {
    systemPrompt += `\n\n[Background knowledge about the user — do not recite, just use when relevant]\n${memoryContent}`
  }
  if (entities && entities.length > 0) {
    const relText = entities.map((e: any) => `- ${e.name}：${e.relation || '未知关系'}${e.notes ? ' (' + e.notes + ')' : ''}`).join('\n')
    systemPrompt += `\n\n[People the user has mentioned]\n${relText}`
  }
  if (summaries.length > 0) {
    const summaryText = summaries
      .map((s: any) => `--- ${s.date} ---\n${s.summary}`)
      .join('\n\n')
    systemPrompt += `\n\n[Recent conversation summaries]\n${summaryText}`
  }
  if (previousContext) {
    systemPrompt += `\n\n[End of last conversation — for continuity, do not repeat]\n${previousContext}`
  }

  // 向量检索：用最新用户消息搜索相关历史（网络失败则跳过）
  try {
    const lastUserContent = lastUserMsg?.content || ''
    if (lastUserContent.length > 10) {
      const searchResults = await searchMessages(supabase, user.id, lastUserContent, 3)
      if (searchResults.length > 0) {
        const relevantHistory = searchResults
          .filter((r: any) => r.similarity > 0.7)
          .map((r: any) => `[${new Date(r.created_at).toLocaleDateString()}] ${r.role}: ${r.content}`)
          .join('\n')
        if (relevantHistory) {
          systemPrompt += `\n\n[Relevant past conversations — reference only when helpful]\n${relevantHistory}`
        }
      }
    }
  } catch {
    // 向量检索失败不影响对话
  }

  // MVP统一用 Sonnet 4.6
  const model = 'anthropic/claude-sonnet-4.6'

  const openRouterMessages = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ]

  // 调用 OpenRouter 流式接口
  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://clover.app',
      'X-Title': 'Clover',
    },
    body: JSON.stringify({
      model,
      messages: openRouterMessages,
      stream: true,
    }),
  })

  if (!upstream.ok) {
    const error = await upstream.text()
    return new Response(JSON.stringify({ error }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 流式透传 + 收集完整回复用于保存
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          controller.enqueue(new TextEncoder().encode(chunk))

          // 从 SSE 数据中提取文本内容
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const json = JSON.parse(line.slice(6))
                const delta = json.choices?.[0]?.delta?.content
                if (delta) fullResponse += delta
              } catch {
                // 解析失败忽略
              }
            }
          }
        }
      } finally {
        controller.close()

        // 流结束后保存 assistant 消息 + 自动提取记忆
        if (fullResponse) {
          await saveMessage(supabase, sessionId, user.id, 'assistant', fullResponse)

          // 异步生成session标题（仅第一轮）
          if (messages.length <= 1) {
            generateSessionTitle(supabase, sessionId, lastUserMsg?.content || '')
          }

          // 每5轮触发一次记忆压缩去重
          if (messages.length > 0 && messages.length % 5 === 0 && memoryContent) {
            compressMemory(memoryContent, process.env.OPENROUTER_API_KEY || '')
              .then(compressed => {
                if (compressed !== memoryContent) {
                  updateProfile(supabase, user.id, compressed)
                }
              })
          }

          // 只有有记忆权限才提取
          if (!userPlan.hasMemory) return
          autoExtractMemory(
            supabase,
            user.id,
            lastUserMsg?.content || '',
            fullResponse,
            memoryContent
          )
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Model': model,
      'X-Session-Id': sessionId,
      'Access-Control-Expose-Headers': 'X-Session-Id',
    },
  })
}

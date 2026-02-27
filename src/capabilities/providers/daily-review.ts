// 每日回顾能力
// 自动或手动触发，生成今日总结

import { registerCapability } from '../registry';
import { ExecutionContext, ExecutionResult } from '../types';

// 生成每日回顾
async function generateDailyReview(
  userId: string,
  apiKey: string,
  supabase: any
): Promise<string> {
  // 获取今天和昨天的消息
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  
  const { data: messages } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .gte('created_at', `${yesterday}T00:00:00`)
    .order('created_at', { ascending: true })
  
  if (!messages || messages.length === 0) {
    return '今天还没有对话记录。'
  }
  
  // 用 AI 生成回顾
  const conversationText = messages
    .map((m: any) => `${m.role}: ${m.content}`)
    .join('\n')
    .slice(0, 8000)  // 限制长度
  
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
          content: `总结用户的今日对话，提取：
1. 今天做出的重要决定
2. 提到的新计划或目标
3. 重要事件或进展
4. 情绪/状态变化

用温暖的语气，不超过 300 字。`,
        },
        { role: 'user', content: conversationText },
      ],
    }),
  })
  
  const data = await res.json()
  return data.choices?.[0]?.message?.content || '今日回顾生成失败'
}

registerCapability({
  id: 'daily-review',
  name: '每日回顾',
  description: '自动总结今天的对话和重要事项',
  type: 'builtin',
  
  intent: {
    patterns: [
      /^(今天|今日)(过得|怎么样|如何|总结|回顾)/i,
      /^总结(一下)?今天/i,
      /^(给我|帮我)?(生成|做|写)?(一个)?(今日|今天)?(回顾|总结)/i,
      /^daily(\s+)?review/i,
      /^today['']?s?\s+(summary|review)/i,
    ],
    aiDescription: '用户想要回顾今天的对话内容、重要决策或事件',
    examples: [
      '今天过得怎么样',
      '帮我总结今天',
      '生成今日回顾',
      "today's summary",
    ],
  },
  
  parameters: [
    {
      name: 'date',
      type: 'string',
      required: false,
      description: '回顾日期（默认今天），格式 YYYY-MM-DD',
    },
  ],
  
  render: {
    type: 'card',
    options: {
      showTimestamp: true,
    },
  },
  
  execute: async (params: any, context: ExecutionContext): Promise<ExecutionResult> => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    try {
      const review = await generateDailyReview(
        context.userId,
        process.env.OPENROUTER_API_KEY || '',
        supabase
      )
      
      // 保存到数据库
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('daily_reviews').upsert(
        {
          user_id: context.userId,
          date: today,
          content: review,
        },
        { onConflict: 'user_id,date' }
      )
      
      return {
        success: true,
        data: {
          content: review,
          date: today,
        },
        metadata: {
          title: `${today} 每日回顾`,
          description: review,
          actions: [
            {
              id: 'share',
              label: '分享',
              type: 'custom',
            },
          ],
        },
      }
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || '生成回顾失败',
      }
    }
  },
  
  permissions: {
    requireAuth: true,
    plan: ['free', 'pro'],
    userConfigurable: true,
    defaultEnabled: true,
  },
})

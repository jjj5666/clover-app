// 每日回顾能力
// 基于记忆系统生成每日总结

import { registerCapability } from '../registry';
import { ExecutionContext, ExecutionResult } from '../types';

// 生成每日回顾
async function generateDailyReview(
  messages: any[],
  memories: string,
  screenTime: any,
  apiKey: string
): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  
  // 构建上下文
  let context = `今天是 ${today}\n\n`
  
  if (memories) {
    context += `用户画像：\n${memories}\n\n`
  }
  
  if (messages.length > 0) {
    context += `今日对话：\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n`
  }
  
  if (screenTime) {
    context += `屏幕时间：\n${JSON.stringify(screenTime)}\n\n`
  }

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
          content: `你是 Clover 的每日回顾生成器。

生成一份温暖、简洁的每日回顾，包含：
1. 今天的重要决策和行动
2. 情绪波动（如果有体现）
3. 值得关注的新信息
4. 明天的建议（轻量级）

风格：像朋友聊天，不要罗列，不要机械。
长度：200字以内。`,
        },
        { role: 'user', content: context },
      ],
    }),
  })

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || '今日暂无特别记录'
}

registerCapability({
  id: 'daily-review',
  name: '每日回顾',
  description: '生成每日总结，包括对话、屏幕时间、重要事件',
  type: 'builtin',

  intent: {
    patterns: [
      /^(今天|今日)?(总结|回顾|怎么样|如何)$/i,
      /^今天(发生)?(了)?什么/i,
      /^今日(回顾|总结)/i,
      /^daily( review)?/i,
      /^today('s)? summary/i,
    ],
    aiDescription: '用户想要查看今天的总结回顾，包括对话、活动、情绪等',
    examples: [
      '今天怎么样',
      '今日回顾',
      '今天发生了什么',
      'daily review',
    ],
  },

  parameters: [
    {
      name: 'date',
      type: 'string',
      required: false,
      description: '回顾的日期，默认今天',
    },
  ],

  render: {
    type: 'card',
  },

  execute: async (params: any, context: ExecutionContext): Promise<ExecutionResult> => {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (!openRouterKey) {
      return {
        success: false,
        data: null,
        error: '每日回顾功能未配置',
      }
    }

    try {
      // 获取今日数据
      const today = new Date().toISOString().split('T')[0]
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      // 获取今日对话
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('user_id', context.userId)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: true })
        .limit(50)

      // 获取用户画像
      const { data: memoryData } = await supabase
        .from('user_memories')
        .select('content')
        .eq('user_id', context.userId)
        .single()

      // 生成回顾
      const review = await generateDailyReview(
        messages || [],
        memoryData?.content || '',
        null,  // 屏幕时间稍后接入
        openRouterKey
      )

      // 保存回顾
      await supabase.from('daily_reviews').upsert({
        user_id: context.userId,
        date: today,
        content: review,
      }, {
        onConflict: 'user_id,date'
      })

      return {
        success: true,
        data: {
          title: `${today} 回顾`,
          content: review,
          stats: {
            messages: messages?.length || 0,
          }
        },
        metadata: {
          title: '每日回顾',
          description: today,
          actions: [
            {
              id: 'share',
              label: '分享',
              type: 'custom',
            },
            {
              id: 'history',
              label: '查看历史',
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
    plan: ['pro'],  // Pro 功能
    userConfigurable: true,
    defaultEnabled: false,
  },
})

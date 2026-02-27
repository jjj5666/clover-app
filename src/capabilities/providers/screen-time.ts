// 屏幕时间分析能力
// 接入 iOS Shortcut 数据，生成每日报告

import { registerCapability } from '../registry';
import { ExecutionContext, ExecutionResult } from '../types';

registerCapability({
  id: 'screen-time',
  name: '屏幕时间',
  description: '记录和分析每日屏幕使用时间',
  type: 'builtin',
  
  intent: {
    patterns: [
      /^屏幕时间(怎么样|如何|多少|分析)?/i,
      /^今天用了多久手机/i,
      /^(查看|给我|帮我)?(屏幕|手机)?(时间|使用)/i,
      /^screen(\s+)?time/i,
      /^how\s+much\s+time\s+did\s+i\s+spend/i,
    ],
    aiDescription: '用户想要查看今天的屏幕使用时间或分析报告',
    examples: [
      '屏幕时间怎么样',
      '今天用了多久手机',
      '给我看看屏幕时间分析',
      'screen time report',
    ],
  },
  
  parameters: [
    {
      name: 'period',
      type: 'enum',
      required: false,
      description: '查询时间段',
      enum: ['today', 'yesterday', 'week', 'month'],
    },
  ],
  
  render: {
    type: 'card',
  },
  
  execute: async (params: any, context: ExecutionContext): Promise<ExecutionResult> => {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    const period = params.period || 'today'
    const today = new Date().toISOString().split('T')[0]
    
    try {
      // 获取屏幕时间数据
      let query = supabase
        .from('screen_time_logs')
        .select('*')
        .eq('user_id', context.userId)
      
      if (period === 'today') {
        query = query.eq('date', today)
      } else if (period === 'yesterday') {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        query = query.eq('date', yesterday)
      } else if (period === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
        query = query.gte('date', weekAgo).order('date', { ascending: false })
      }
      
      const { data: logs } = await query
      
      if (!logs || logs.length === 0) {
        return {
          success: true,
          data: {
            message: '还没有屏幕时间数据',
            setupInstructions: '使用 iOS Shortcut 将屏幕时间数据发送到 Clover',
          },
          metadata: {
            title: '屏幕时间',
            description: '暂无数据。请配置 iOS Shortcut 自动上报。',
          },
        }
      }
      
      // 计算总时间
      const totalMinutes = logs.reduce((sum: number, log: any) => sum + (log.minutes || 0), 0)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      
      // 分类统计
      const byCategory: Record<string, number> = {}
      logs.forEach((log: any) => {
        const cat = log.category || '其他'
        byCategory[cat] = (byCategory[cat] || 0) + (log.minutes || 0)
      })
      
      return {
        success: true,
        data: {
          totalMinutes,
          formatted: `${hours}小时${minutes}分钟`,
          byCategory,
          logs,
        },
        metadata: {
          title: period === 'today' ? '今日屏幕时间' : '屏幕时间报告',
          description: `今天使用了 ${hours}小时${minutes}分钟`,
          actions: [
            {
              id: 'weekly-report',
              label: '查看周报',
              type: 'custom',
            },
          ],
        },
      }
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || '获取屏幕时间失败',
      }
    }
  },
  
  permissions: {
    requireAuth: true,
    plan: ['free', 'pro'],
    userConfigurable: true,
    defaultEnabled: false,
  },
})

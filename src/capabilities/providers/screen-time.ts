// 屏幕时间分析能力
// 接收 iOS Shortcut 上报的屏幕时间数据，生成报告

import { registerCapability } from '../registry';
import { ExecutionContext, ExecutionResult } from '../types';

registerCapability({
  id: 'screen-time',
  name: '屏幕时间分析',
  description: '分析每日屏幕使用时间，识别趋势和异常',
  type: 'builtin',

  intent: {
    patterns: [
      /^屏幕时间/i,
      /^今天(用了)?多少(时间|小时)/i,
      /^手机(使用)?(时间|情况)/i,
      /^screen( time)?/i,
      /^how much time (did I spend|have I spent)/i,
    ],
    aiDescription: '用户想要查看今天的屏幕使用时间统计和分析',
    examples: [
      '屏幕时间',
      '今天用了多久手机',
      'screen time',
      '我这周屏幕时间怎么样',
    ],
  },

  parameters: [
    {
      name: 'period',
      type: 'enum',
      required: false,
      description: '查询时间段',
      enum: ['今天', '昨天', '本周', '上周', '本月'],
    },
  ],

  render: {
    type: 'card',
  },

  execute: async (params: any, context: ExecutionContext): Promise<ExecutionResult> => {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      // 获取最近的屏幕时间数据
      const { data: screenTimeData } = await supabase
        .from('screen_time_logs')
        .select('*')
        .eq('user_id', context.userId)
        .order('date', { ascending: false })
        .limit(7)

      if (!screenTimeData || screenTimeData.length === 0) {
        return {
          success: true,
          data: {
            title: '屏幕时间',
            content: '暂无数据。使用 iOS Shortcut 自动上报屏幕时间，或手动记录。',
            setup: true,
          },
          metadata: {
            title: '屏幕时间分析',
            description: '数据未接入',
            actions: [
              {
                id: 'setup',
                label: '查看接入方法',
                type: 'custom',
              },
            ],
          },
        }
      }

      // 计算统计
      const today = screenTimeData[0]
      const avgMinutes = Math.round(
        screenTimeData.reduce((sum, d) => sum + d.total_minutes, 0) / screenTimeData.length
      )
      
      // 构建报告
      const topApps = today.app_usage
        ? Object.entries(today.app_usage)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 3)
        : []

      let report = `今日屏幕时间：${Math.floor(today.total_minutes / 60)}小时${today.total_minutes % 60}分钟\n\n`
      
      if (topApps.length > 0) {
        report += '主要使用：\n'
        topApps.forEach(([app, minutes]: [string, any]) => {
          report += `• ${app}: ${Math.floor(minutes as number / 60)}小时${(minutes as number) % 60}分钟\n`
        })
        report += '\n'
      }
      
      report += `近7天平均：${Math.floor(avgMinutes / 60)}小时${avgMinutes % 60}分钟/天`

      return {
        success: true,
        data: {
          title: '屏幕时间报告',
          content: report,
          stats: {
            today: today.total_minutes,
            average: avgMinutes,
          },
        },
        metadata: {
          title: '屏幕时间分析',
          description: today.date,
          actions: [
            {
              id: 'trend',
              label: '查看趋势',
              type: 'custom',
            },
            {
              id: 'settings',
              label: '设置提醒',
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

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 内置能力列表
const BUILTIN_CAPABILITIES = [
  {
    id: 'image-generation',
    name: '图片生成',
    description: '根据描述生成图片，支持多种风格和场景',
    type: 'builtin' as const,
    configurable: false,
    icon: 'image',
  },
  {
    id: 'builder',
    name: '应用生成',
    description: '根据描述生成网页或应用',
    type: 'builtin' as const,
    configurable: false,
    icon: 'code',
  },
  {
    id: 'daily-review',
    name: '每日回顾',
    description: '自动总结今天的对话和重要事项',
    type: 'builtin' as const,
    configurable: true,
    icon: 'calendar',
  },
  {
    id: 'screen-time',
    name: '屏幕时间',
    description: '记录和分析每日屏幕使用时间',
    type: 'builtin' as const,
    configurable: true,
    icon: 'clock',
  },
]

// GET: 获取用户的能力列表
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    // 获取用户配置
    const { data: userConfigs } = await supabase
      .from('user_capabilities')
      .select('capability_id, enabled, config')
      .eq('user_id', user.id)
    
    const configMap = new Map(
      (userConfigs || []).map((c: any) => [c.capability_id, c])
    )
    
    // 合并内置能力和用户配置
    const capabilities = BUILTIN_CAPABILITIES.map(cap => {
      const userConfig = configMap.get(cap.id)
      return {
        ...cap,
        enabled: userConfig?.enabled ?? true,
        config: userConfig?.config || {},
      }
    })
    
    return new Response(JSON.stringify({ capabilities }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// POST: 更新能力配置
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const { capabilityId, enabled, config } = await req.json()
  
  if (!capabilityId) {
    return new Response(JSON.stringify({ error: 'capabilityId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  try {
    const { error } = await supabase
      .from('user_capabilities')
      .upsert(
        {
          user_id: user.id,
          capability_id: capabilityId,
          enabled,
          config: config || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,capability_id' }
      )
    
    if (error) throw error
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

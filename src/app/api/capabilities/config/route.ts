import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 获取用户能力配置
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { data } = await supabase
    .from('user_capability_configs')
    .select('*')
    .eq('user_id', user.id)

  return new Response(JSON.stringify({ configs: data || [] }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// 更新用户能力配置
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

  // upsert 配置
  const { error } = await supabase
    .from('user_capability_configs')
    .upsert({
      user_id: user.id,
      capability_id: capabilityId,
      enabled,
      config,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,capability_id'
    })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

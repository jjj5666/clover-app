import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// iOS Shortcut 上报屏幕时间数据
export async function POST(req: NextRequest) {
  // 简单 API Key 验证
  const apiKey = req.headers.get('X-API-Key')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const supabase = await createClient()
  
  // 查找用户
  const { data: keyData } = await supabase
    .from('screen_time_api_keys')
    .select('user_id')
    .eq('api_key', apiKey)
    .single()

  if (!keyData) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const { totalMinutes, appUsage, pickups, date } = await req.json()
  
  const recordDate = date || new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('screen_time_logs')
    .upsert({
      user_id: keyData.user_id,
      date: recordDate,
      total_minutes: totalMinutes,
      app_usage: appUsage || {},
      pickups: pickups || 0,
    }, {
      onConflict: 'user_id,date'
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

// 获取或生成 API Key
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 查找现有 key
  const { data } = await supabase
    .from('screen_time_api_keys')
    .select('api_key')
    .eq('user_id', user.id)
    .single()

  if (data) {
    return new Response(JSON.stringify({ apiKey: data.api_key }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // 生成新 key
  const newKey = `st_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  
  const { error } = await supabase
    .from('screen_time_api_keys')
    .insert({
      user_id: user.id,
      api_key: newKey,
    })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ apiKey: newKey }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

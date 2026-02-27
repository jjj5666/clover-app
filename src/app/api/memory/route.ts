import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getProfile, updateProfile } from '@/lib/memory/profile'

// GET /api/memory — 返回当前用户的记忆文本
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const content = await getProfile(supabase, user.id)
  return Response.json({ content })
}

// PUT /api/memory — 更新当前用户的记忆文本
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { content } = await req.json()

  if (typeof content !== 'string') {
    return Response.json({ error: 'content must be a string' }, { status: 400 })
  }

  await updateProfile(supabase, user.id, content)
  return Response.json({ ok: true })
}

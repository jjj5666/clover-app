import { createClient } from '@/lib/supabase/server'
import { checkLimit } from '@/lib/billing/limits'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const result = await checkLimit(supabase, user.id)
  return Response.json(result)
}

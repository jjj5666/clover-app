import { createClient } from '@/lib/supabase/server'
import { getUserPlan } from '@/lib/billing/plans'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const plan = await getUserPlan(supabase, user.id)
  return Response.json(plan)
}

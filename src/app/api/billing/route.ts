import { createClient } from '@/lib/supabase/server'

// Lemon Squeezy Webhook — 订阅状态变更
// 上线后配置：Settings → Webhooks → URL: /api/billing
export async function POST(req: Request) {
  // TODO: 验证 webhook 签名（LEMON_SQUEEZY_SIGNING_SECRET）
  const body = await req.json()
  const event = body.meta?.event_name

  const supabase = await createClient()

  if (event === 'subscription_created' || event === 'subscription_updated') {
    const email = body.data?.attributes?.user_email
    const status = body.data?.attributes?.status
    const lsId = body.data?.id

    if (email && status === 'active') {
      // 根据邮箱找用户
      // 注意：这里需要用 service role key 才能查 auth.users
      // MVP 阶段简化：用 subscriptions 表的 lemon_squeezy_id 匹配
      // 正式上线时需要完善
    }
  }

  if (event === 'subscription_expired' || event === 'subscription_cancelled') {
    // 降级为免费
  }

  return Response.json({ ok: true })
}

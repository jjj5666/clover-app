// Lemon Squeezy Webhook 处理
// 接收订阅创建/更新/过期事件
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

// 验证 webhook 签名
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') || ''
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || ''

  // 验证签名（如果配了 secret）
  if (secret && signature) {
    if (!verifySignature(rawBody, signature, secret)) {
      return new Response('Invalid signature', { status: 401 })
    }
  }

  const event = JSON.parse(rawBody)
  const eventName = event.meta?.event_name
  const customData = event.meta?.custom_data
  const userId = customData?.user_id

  if (!userId) {
    return new Response('Missing user_id', { status: 400 })
  }

  const supabase = await createClient()

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_updated': {
      const status = event.data?.attributes?.status
      const endsAt = event.data?.attributes?.ends_at || event.data?.attributes?.renews_at
      const lsId = event.data?.id

      if (status === 'active' || status === 'on_trial') {
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan: 'pro',
          lemon_squeezy_id: String(lsId),
          expires_at: endsAt,
        }, { onConflict: 'user_id' })
      }
      break
    }

    case 'subscription_expired':
    case 'subscription_cancelled': {
      await supabase.from('subscriptions').update({
        plan: 'free',
        expires_at: new Date().toISOString(),
      }).eq('user_id', userId)
      break
    }
  }

  return Response.json({ ok: true })
}

// 订阅与试用管理
import { SupabaseClient } from '@supabase/supabase-js'

// 用户注册后自动获得3天试用
const TRIAL_DAYS = 3

export type PlanType = 'trial' | 'free' | 'pro'

export interface UserPlan {
  plan: PlanType
  trialEndsAt: string | null
  hasMemory: boolean  // 是否有记忆功能
}

// 获取用户当前计划
export async function getUserPlan(supabase: SupabaseClient, userId: string): Promise<UserPlan> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, trial_ends_at, expires_at')
    .eq('user_id', userId)
    .single()

  // 没有记录 → 创建试用
  if (!sub) {
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString()
    await supabase.from('subscriptions').insert({
      user_id: userId,
      plan: 'trial',
      trial_ends_at: trialEnd,
    })
    return { plan: 'trial', trialEndsAt: trialEnd, hasMemory: true }
  }

  // Pro 用户（付费且未过期）
  if (sub.plan === 'pro' && sub.expires_at && new Date(sub.expires_at) > new Date()) {
    return { plan: 'pro', trialEndsAt: null, hasMemory: true }
  }

  // 试用期内
  if (sub.plan === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date()) {
    return { plan: 'trial', trialEndsAt: sub.trial_ends_at, hasMemory: true }
  }

  // 试用过期 → 降级为免费（无记忆）
  if (sub.plan === 'trial') {
    await supabase.from('subscriptions').update({ plan: 'free' }).eq('user_id', userId)
  }

  return { plan: 'free', trialEndsAt: null, hasMemory: false }
}

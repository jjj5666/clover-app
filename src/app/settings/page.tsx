import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/memory/profile'
import { getUserPlan } from '@/lib/billing/plans'
import MemoryView from './MemoryView'
import { CapabilitiesPanel } from './CapabilitiesPanel'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memory = await getProfile(supabase, user.id)
  const plan = await getUserPlan(supabase, user.id)

  const trialDaysLeft = plan.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(plan.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">🍀 Clover</h1>
        <a href="/chat" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Chat
        </a>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-8">
        {/* 计划信息 */}
        <div>
          <h2 className="text-xl font-medium mb-4">Your Plan</h2>
          <div className="bg-white rounded-lg border p-6">
            {plan.plan === 'trial' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Trial</span>
                  <span className="text-sm text-gray-500">{trialDaysLeft} days remaining</span>
                </div>
                <p className="text-sm text-gray-600">You have full access to all features including memory. After trial ends, memory features require Pro.</p>
              </div>
            )}
            {plan.plan === 'free' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">Free</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">Your trial has ended. Upgrade to Pro to restore memory features.</p>
                <button className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  Upgrade to Pro — $9.9/mo
                </button>
              </div>
            )}
            {plan.plan === 'pro' && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Pro</span>
                </div>
                <p className="text-sm text-gray-600">Full access to all features including memory, relationships, and daily summaries.</p>
              </div>
            )}
          </div>
        </div>

        {/* 账户信息 */}
        <div>
          <h2 className="text-xl font-medium mb-4">Account</h2>
          <div className="bg-white rounded-lg border p-6">
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>

        {/* 能力管理 */}
        <div>
          <h2 className="text-xl font-medium mb-2">能力管理</h2>
          <p className="text-sm text-gray-500 mb-4">
            启用或禁用 Clover 的能力，连接外部服务
          </p>
          <CapabilitiesPanel />
        </div>

        {/* 记忆面板 */}
        <div>
          <h2 className="text-xl font-medium mb-2">What Clover remembers about you</h2>
          {plan.hasMemory ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Clover automatically learns about you from conversations. You can delete anything here.
              </p>
              <MemoryView initialMemory={memory} />
            </>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center">
              <p className="text-gray-400 text-lg">🔒 Memory is a Pro feature</p>
              <p className="text-gray-400 text-sm mt-2">
                Upgrade to Pro to let Clover remember your preferences, goals, and conversations.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

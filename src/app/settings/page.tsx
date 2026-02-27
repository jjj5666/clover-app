import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/memory/profile'
import MemoryView from './MemoryView'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memory = await getProfile(supabase, user.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">🍀 Clover</h1>
        <a href="/chat" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Chat
        </a>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <h2 className="text-xl font-medium mb-2">What Clover remembers about you</h2>
        <p className="text-sm text-gray-500 mb-6">
          Clover automatically learns about you from conversations. You can delete anything here.
        </p>

        <MemoryView initialMemory={memory} />
      </main>
    </div>
  )
}

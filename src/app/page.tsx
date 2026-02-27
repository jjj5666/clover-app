import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🍀 Clover</h1>
        <Link href="/login" className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
          Get Started
        </Link>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-32 text-center">
        <h2 className="text-5xl font-bold text-gray-900 leading-tight">
          The AI that<br />
          <span className="text-green-600">actually remembers you</span>
        </h2>
        <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto">
          Clover learns who you are, what you care about, and who matters to you — automatically, across every conversation.
        </p>
        <div className="mt-10">
          <Link href="/login" className="px-8 py-4 bg-green-600 text-white rounded-xl text-lg font-semibold hover:bg-green-700 transition-colors inline-block">
            Try Clover Free →
          </Link>
        </div>

        {/* Features */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
          <div>
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="text-lg font-semibold text-gray-900">Automatic Memory</h3>
            <p className="mt-2 text-gray-500 text-sm">
              Clover remembers your preferences, goals, and the people you mention — without you telling it to.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-lg font-semibold text-gray-900">Relationship Aware</h3>
            <p className="mt-2 text-gray-500 text-sm">
              Mention someone once, and Clover remembers who they are and how they relate to you.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-lg font-semibold text-gray-900">Daily Continuity</h3>
            <p className="mt-2 text-gray-500 text-sm">
              Start a new chat tomorrow and pick up right where you left off. No more repeating yourself.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-32">
          <h3 className="text-3xl font-bold text-gray-900">How it works</h3>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-2">1</div>
              <p className="text-gray-700 font-medium">Just chat naturally</p>
              <p className="text-sm text-gray-500 mt-1">Talk about anything. Clover listens.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-2">2</div>
              <p className="text-gray-700 font-medium">Clover learns automatically</p>
              <p className="text-sm text-gray-500 mt-1">Important things are remembered. Small talk is forgotten.</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-2">3</div>
              <p className="text-gray-700 font-medium">Every chat gets better</p>
              <p className="text-sm text-gray-500 mt-1">The more you use Clover, the more it understands you.</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-32">
          <h3 className="text-3xl font-bold text-gray-900">Pricing</h3>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="p-8 border rounded-xl text-left">
              <h4 className="font-semibold text-lg">Free</h4>
              <p className="text-3xl font-bold mt-2">$0</p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li>✓ 3-day full trial</li>
                <li>✓ Basic conversations</li>
                <li className="text-gray-400">✗ Memory features</li>
                <li className="text-gray-400">✗ Conversation history</li>
              </ul>
            </div>
            <div className="p-8 border-2 border-green-500 rounded-xl text-left relative">
              <span className="absolute -top-3 left-6 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">Popular</span>
              <h4 className="font-semibold text-lg">Pro</h4>
              <p className="text-3xl font-bold mt-2">$9.9<span className="text-base font-normal text-gray-500">/mo</span></p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                <li>✓ Unlimited conversations</li>
                <li>✓ Full memory system</li>
                <li>✓ Relationship tracking</li>
                <li>✓ Daily summaries</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-gray-400">
        © 2026 Clover. Your AI companion that remembers.
      </footer>
    </div>
  )
}

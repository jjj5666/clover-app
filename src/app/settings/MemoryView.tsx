'use client'

import { useState } from 'react'

export default function MemoryView({ initialMemory }: { initialMemory: string }) {
  const [memory, setMemory] = useState(initialMemory)
  const [saving, setSaving] = useState(false)

  // 把记忆文本拆成条目
  const items = memory
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.slice(2))

  // 非条目的内容（标题等）
  const headers = memory
    .split('\n')
    .filter(line => line.trim().startsWith('#'))
    .join('\n')

  // 删除单条记忆
  const handleDelete = async (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    const newMemory = newItems.length > 0
      ? (headers ? headers + '\n' : '') + newItems.map(item => `- ${item}`).join('\n')
      : ''

    setSaving(true)
    await fetch('/api/memory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newMemory }),
    })
    setMemory(newMemory)
    setSaving(false)
  }

  // 清除所有记忆
  const handleClearAll = async () => {
    if (!confirm('Clear all memories? Clover will start fresh.')) return
    setSaving(true)
    await fetch('/api/memory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    })
    setMemory('')
    setSaving(false)
  }

  if (!memory || items.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-400 text-lg">Nothing yet</p>
        <p className="text-gray-400 text-sm mt-2">
          Start chatting and Clover will automatically remember important things about you.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="bg-white rounded-lg border px-4 py-3 flex items-start justify-between gap-3">
          <span className="text-sm text-gray-700 flex-1">{item}</span>
          <button
            onClick={() => handleDelete(i)}
            disabled={saving}
            className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="pt-4">
        <button
          onClick={handleClearAll}
          disabled={saving}
          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Clear all memories'}
        </button>
      </div>
    </div>
  )
}

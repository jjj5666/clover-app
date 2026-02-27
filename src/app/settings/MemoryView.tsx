'use client'

import { useState } from 'react'

export default function MemoryView({ initialMemory }: { initialMemory: string }) {
  const [memory, setMemory] = useState(initialMemory)
  const [saving, setSaving] = useState(false)

  // 解析记忆文本为分组结构
  const parseMemory = (text: string) => {
    if (!text) return []

    const groups: { title: string; items: string[] }[] = []
    let currentGroup: { title: string; items: string[] } = { title: '记忆', items: [] }

    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('## ')) {
        if (currentGroup.items.length > 0) groups.push(currentGroup)
        currentGroup = { title: trimmed.slice(3), items: [] }
      } else if (trimmed.startsWith('- ')) {
        currentGroup.items.push(trimmed.slice(2))
      }
    }
    if (currentGroup.items.length > 0) groups.push(currentGroup)

    // 如果没有分组标题，所有条目放一个组
    if (groups.length === 0) {
      const items = text.split('\n').filter(l => l.trim().startsWith('- ')).map(l => l.trim().slice(2))
      if (items.length > 0) groups.push({ title: '记忆', items })
    }

    return groups
  }

  const groups = parseMemory(memory)
  const allItems = groups.flatMap(g => g.items)

  // 删除单条记忆
  const handleDelete = async (groupIdx: number, itemIdx: number) => {
    setSaving(true)
    const newGroups = groups.map((g, gi) => ({
      ...g,
      items: g.items.filter((_, ii) => !(gi === groupIdx && ii === itemIdx))
    })).filter(g => g.items.length > 0)

    const newMemory = newGroups
      .map(g => `## ${g.title}\n${g.items.map(i => `- ${i}`).join('\n')}`)
      .join('\n\n')

    await fetch('/api/memory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newMemory }),
    })
    setMemory(newMemory)
    setSaving(false)
  }

  // 清除所有
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

  if (allItems.length === 0) {
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
    <div className="space-y-6">
      {groups.map((group, gi) => (
        <div key={gi}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {group.title}
          </h3>
          <div className="space-y-2">
            {group.items.map((item, ii) => (
              <div key={ii} className="bg-white rounded-lg border px-4 py-3 flex items-start justify-between gap-3">
                <span className="text-sm text-gray-700 flex-1">{item}</span>
                <button
                  onClick={() => handleDelete(gi, ii)}
                  disabled={saving}
                  className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-2">
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

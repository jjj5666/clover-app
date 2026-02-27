'use client'

import { useState } from 'react'

interface MemorySection {
  title: string
  items: string[]
}

function parseMemory(memory: string): MemorySection[] {
  if (!memory) return []

  const sections: MemorySection[] = []
  let currentTitle = '其他'
  let currentItems: string[] = []

  for (const line of memory.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      // 保存上一个分组
      if (currentItems.length > 0) {
        sections.push({ title: currentTitle, items: currentItems })
      }
      currentTitle = trimmed.slice(3).trim()
      currentItems = []
    } else if (trimmed.startsWith('- ')) {
      currentItems.push(trimmed.slice(2))
    }
  }
  // 保存最后一个分组
  if (currentItems.length > 0) {
    sections.push({ title: currentTitle, items: currentItems })
  }

  return sections
}

export default function MemoryView({ initialMemory }: { initialMemory: string }) {
  const [memory, setMemory] = useState(initialMemory)
  const [saving, setSaving] = useState(false)

  const sections = parseMemory(memory)
  const hasMemory = sections.some(s => s.items.length > 0)

  // 删除单条记忆
  const handleDelete = async (sectionIdx: number, itemIdx: number) => {
    const newSections = sections.map((s, si) => {
      if (si === sectionIdx) {
        return { ...s, items: s.items.filter((_, ii) => ii !== itemIdx) }
      }
      return s
    }).filter(s => s.items.length > 0)

    const newMemory = newSections
      .map(s => `## ${s.title}\n${s.items.map(i => `- ${i}`).join('\n')}`)
      .join('\n\n')

    setSaving(true)
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

  if (!hasMemory) {
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
      {sections.map((section, si) => (
        <div key={si}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.items.map((item, ii) => (
              <div key={ii} className="bg-white rounded-lg border px-4 py-3 flex items-start justify-between gap-3">
                <span className="text-sm text-gray-700 flex-1">{item}</span>
                <button
                  onClick={() => handleDelete(si, ii)}
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

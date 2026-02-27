'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import LogoutButton from './LogoutButton'
import { CapabilityResult } from '@/capabilities/renderers/CapabilityResult'

interface Message {
  role: 'user' | 'assistant'
  content: string
  capabilityResult?: {
    capabilityId: string
    renderType: string
    result: any
  }
}

interface Session {
  id: string
  created_at: string
  title: string | null
}

export default function ChatPage() {
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [plan, setPlan] = useState<{ plan: string; trialEndsAt: string | null; hasMemory: boolean } | null>(null)

  // 侧边栏
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 初始化：获取用户、用量、历史sessions
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    fetch('/api/usage').then(r => r.json()).then(setUsage).catch(() => {})
    fetch('/api/plan').then(r => r.json()).then(setPlan).catch(() => {})
    loadSessions()
  }, [])

  // 加载历史 session 列表
  const loadSessions = async () => {
    const { data } = await supabase
      .from('sessions')
      .select('id, created_at, title')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setSessions(data)
  }

  // 加载某个 session 的消息
  const loadSessionMessages = async (sessionId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (data) {
      setMessages(data as Message[])
      setCurrentSessionId(sessionId)
      setSidebarOpen(false)
    }
  }

  // 新对话
  const handleNewChat = () => {
    setMessages([])
    setCurrentSessionId(null)
    setSidebarOpen(false)
  }

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // textarea 自适应
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [])

  // 发送消息
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || limitReached) return

    const userMessage: Message = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // 占位 assistant 消息
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const isNewConversation = messages.length === 0
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          sessionId: currentSessionId,
          newSession: isNewConversation && !currentSessionId,
        }),
      })

      // 登录态失效 → 跳转登录
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }

      if (res.status === 429) {
        const data = await res.json()
        setLimitReached(true)
        setUsage({ used: data.used, limit: data.limit })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `You've reached today's limit (${data.used}/${data.limit}). Upgrade to Pro for unlimited.`,
          }
          return updated
        })
        return
      }

      // 检查是否是能力响应（非流式）
      const contentType = res.headers.get('Content-Type')
      if (contentType?.includes('application/json')) {
        const data = await res.json()
        if (data.type === 'capability') {
          // 能力执行响应
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { 
                ...last, 
                content: data.result.metadata?.description || '',
                capabilityResult: {
                  capabilityId: data.capabilityId,
                  renderType: data.renderType,
                  result: data.result,
                }
              }
            }
            return updated
          })
          loadSessions()
          return
        }
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (!res.body) throw new Error('No body')

      // 从响应头获取 sessionId，用于后续消息
      const returnedSessionId = res.headers.get('X-Session-Id')
      if (returnedSessionId) setCurrentSessionId(returnedSessionId)

      setUsage(prev => prev ? { ...prev, used: prev.used + 1 } : prev)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const token = json.choices?.[0]?.delta?.content ?? ''
            if (!token) continue
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: last.content + token }
              }
              return updated
            })
          } catch {}
        }
      }

      // 流结束后刷新 session 列表
      loadSessions()
    } catch (err) {
      console.error(err)
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = { ...last, content: '抱歉，出了点问题，请重试。' }
        }
        return updated
      })
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, limitReached])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // 格式化 session 日期
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    if (d.toDateString() === today.toDateString()) return `Today ${time}`
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏遮罩（移动端） */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 侧边栏 */}
      <aside className={`
        fixed md:relative z-30 h-full w-64 bg-white border-r flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-3 border-b">
          <button
            onClick={handleNewChat}
            className="w-full py-2 px-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
          >
            + New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => loadSessionMessages(s.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                currentSessionId === s.id ? 'bg-green-50 text-green-700' : 'text-gray-600'
              }`}
            >
              <span className="block truncate font-medium">{s.title || 'New conversation'}</span>
              <span className="block text-xs text-gray-400 truncate">{formatDate(s.created_at)}</span>
            </button>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-gray-400 p-4 text-center">No conversations yet</p>
          )}
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部导航 */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900">🍀 Clover</h1>
          </div>
          <div className="flex items-center gap-4">
            {plan && plan.plan === 'trial' && plan.trialEndsAt && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Trial · {Math.max(0, Math.ceil((new Date(plan.trialEndsAt).getTime() - Date.now()) / 86400000))}d left
              </span>
            )}
            {plan && plan.plan === 'free' && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                Free · No memory
              </span>
            )}
            {plan && plan.plan === 'pro' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Pro</span>
            )}
            <a href="/builder" className="text-sm text-blue-600 font-medium hover:text-blue-700"> Builder</a>
            <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700">Settings</a>
            <LogoutButton />
          </div>
        </header>

        {/* 消息列表 */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-20">
                <h2 className="text-2xl font-medium text-gray-800">Welcome 👋</h2>
                <p className="mt-2 text-gray-500">有什么我可以帮你的吗？</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-green-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                }`}>
                  {/* 能力结果消息 */}
                  {msg.capabilityResult && (
                    <div className="mb-2">
                      <CapabilityResult 
                        renderType={msg.capabilityResult.renderType}
                        data={msg.capabilityResult.result.data}
                        actions={msg.capabilityResult.result.metadata?.actions}
                        onAction={(action) => {
                          // 处理Action点击
                          if (action.type === 'modify') {
                            setInput(`修改：${action.payload?.description || action.payload?.prompt || ''}`)
                          } else if (action.type === 'retry') {
                            sendMessage()
                          }
                        }}
                      />
                    </div>
                  )}
                  {/* 文字内容 */}
                  {msg.content ? (
                    msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-green-600 prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content
                  ) : (msg.role === 'assistant' && isLoading ? (
                    <span className="inline-flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    </span>
                  ) : null)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* 输入框 */}
        <footer className="bg-white border-t flex-shrink-0">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); adjustHeight() }}
              onKeyDown={handleKeyDown}
              placeholder={limitReached ? 'Daily limit reached' : '发消息… (Enter 发送)'}
              rows={1}
              disabled={isLoading || limitReached}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent disabled:opacity-50 max-h-40 overflow-y-auto"
              style={{ height: 'auto' }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim() || limitReached}
              className="flex-shrink-0 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {isLoading ? '...' : '发送'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

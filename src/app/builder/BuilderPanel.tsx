'use client'

import { useState } from 'react'
import { Loader2, Wand2, Globe, Code, Check, Copy } from 'lucide-react'

interface BuilderResult {
  code: string
  deployUrl?: string
  deployId?: string
  preview?: boolean
}

export function BuilderPanel() {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BuilderResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generateApp = async () => {
    if (!description.trim()) return
    
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setResult(data)
    } catch (err: any) {
      setError(err.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    if (result?.code) {
      navigator.clipboard.writeText(result.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Clover Builder</h1>
        <p className="text-gray-500">描述你想要的网页或应用，AI 帮你生成</p>
      </div>

      <div className="space-y-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例如：帮我做一个记账网页，可以添加收支记录，显示月度统计，用蓝色主题..."
          className="w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <button
          onClick={generateApp}
          disabled={loading || !description.trim()}
          className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              生成应用
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
            <Check className="w-5 h-5" />
            <span>生成成功！</span>
          </div>

          {result.deployUrl ? (
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <span className="font-medium">在线预览</span>
              </div>
              <a
                href={result.deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-blue-600 underline">{result.deployUrl}</span>
              </a>
              <p className="text-sm text-gray-500">
                部署可能需要 30-60 秒，如果打不开请稍后再试
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
              自动部署未启用，你可以复制代码手动部署到 Vercel
            </div>
          )}

          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">生成的代码</span>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <pre className="p-4 overflow-auto max-h-96 text-sm bg-gray-50">
              <code>{result.code}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Loader2, Wand2, Globe, Code, Check, Copy, Sparkles, Rocket } from 'lucide-react'

interface BuilderResult {
  code: string
  deployUrl?: string
  deployId?: string
  preview?: boolean
}

type BuildStatus = 'idle' | 'generating' | 'deploying' | 'done' | 'error'

export function BuilderPanel() {
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<BuildStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BuilderResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generateApp = async () => {
    if (!description.trim()) return
    
    setStatus('generating')
    setProgress(10)
    setError('')
    setResult(null)

    try {
      // 阶段 1：生成代码
      const res = await fetch('/api/builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setProgress(50)
      setResult(data)

      // 阶段 2：如果有 deployId，轮询部署状态
      if (data.deployId) {
        setStatus('deploying')
        setProgress(60)
        
        // 轮询部署状态，最多 30 秒
        let attempts = 0
        const maxAttempts = 30
        
        while (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000))
          attempts++
          
          setProgress(60 + Math.min(35, attempts))
          
          try {
            const statusRes = await fetch(`/api/builder?deployId=${data.deployId}`)
            const statusData = await statusRes.json()
            
            if (statusData.ready) {
              setResult(prev => prev ? { ...prev, deployUrl: statusData.url } : null)
              break
            }
          } catch {
            // 忽略轮询错误
          }
        }
      }

      setProgress(100)
      setStatus('done')
    } catch (err: any) {
      setError(err.message || '生成失败')
      setStatus('error')
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
          disabled={status !== 'idle' || !description.trim()}
          className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'idle' ? (
            <>
              <Wand2 className="w-5 h-5" />
              生成应用
            </>
          ) : status === 'generating' ? (
            <>
              <Sparkles className="w-5 h-5 animate-pulse" />
              AI 正在写代码...
            </>
          ) : status === 'deploying' ? (
            <>
              <Rocket className="w-5 h-5 animate-bounce" />
              部署到云端...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              完成！
            </>
          )}
        </button>

        {/* 进度条 */}
        {status !== 'idle' && status !== 'error' && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span className={status === 'generating' ? 'text-blue-600 font-medium' : ''}>
                {status === 'generating' ? '● ' : ''}生成代码
              </span>
              <span className={status === 'deploying' ? 'text-blue-600 font-medium' : ''}>
                {status === 'deploying' ? '● ' : ''}部署上线
              </span>
              <span className={status === 'done' ? 'text-green-600 font-medium' : ''}>
                {status === 'done' ? '● ' : ''}完成
              </span>
            </div>
          </div>
        )}
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

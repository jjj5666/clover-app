// 能力发现/管理组件
// 用户可以查看、启用、禁用能力，连接外部服务

'use client'

import { useState, useEffect } from 'react'
import { 
  Image, 
  Globe, 
  Clock, 
  Calendar, 
  FileText, 
  Github, 
  Plus,
  Check,
  ExternalLink,
  Settings
} from 'lucide-react'

interface CapabilityItem {
  id: string
  name: string
  description: string
  icon: string
  type: 'builtin' | 'integration' | 'user-api'
  enabled: boolean
  configurable: boolean
  connected?: boolean
  category: string
}

const DEFAULT_CAPABILITIES: CapabilityItem[] = [
  {
    id: 'image-generation',
    name: '图片生成',
    description: '根据描述生成图片，支持多种风格',
    icon: 'image',
    type: 'builtin',
    enabled: true,
    configurable: false,
    category: '创作',
  },
  {
    id: 'builder',
    name: '应用生成',
    description: '根据描述生成网页或应用',
    icon: 'globe',
    type: 'builtin',
    enabled: true,
    configurable: false,
    category: '创作',
  },
  {
    id: 'daily-review',
    name: '每日回顾',
    description: '每晚生成今日总结，包括对话、屏幕时间等',
    icon: 'calendar',
    type: 'builtin',
    enabled: false,
    configurable: true,
    category: '记忆',
  },
  {
    id: 'screen-time',
    name: '屏幕时间分析',
    description: '分析每日屏幕使用时间，生成报告',
    icon: 'clock',
    type: 'builtin',
    enabled: false,
    configurable: true,
    category: '数据',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: '查询和同步 Notion 笔记',
    icon: 'file-text',
    type: 'integration',
    enabled: false,
    configurable: true,
    connected: false,
    category: '外部服务',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: '查看仓库、创建 issue',
    icon: 'github',
    type: 'integration',
    enabled: false,
    configurable: true,
    connected: false,
    category: '外部服务',
  },
]

const ICONS: Record<string, React.ReactNode> = {
  image: <Image className="w-5 h-5" />,
  globe: <Globe className="w-5 h-5" />,
  clock: <Clock className="w-5 h-5" />,
  calendar: <Calendar className="w-5 h-5" />,
  'file-text': <FileText className="w-5 h-5" />,
  github: <Github className="w-5 h-5" />,
}

export function CapabilitiesPanel() {
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>(DEFAULT_CAPABILITIES)
  const [loading, setLoading] = useState<string | null>(null)

  // 从服务器加载用户配置
  useEffect(() => {
    fetch('/api/capabilities/config')
      .then(r => r.json())
      .then(data => {
        if (data.configs) {
          setCapabilities(prev => prev.map(cap => {
            const config = data.configs.find((c: any) => c.capabilityId === cap.id)
            return config ? { ...cap, enabled: config.enabled, connected: config.connected } : cap
          }))
        }
      })
      .catch(() => {})
  }, [])

  // 切换能力启用状态
  const toggleCapability = async (id: string, enabled: boolean) => {
    setLoading(id)
    try {
      await fetch('/api/capabilities/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capabilityId: id, enabled }),
      })
      setCapabilities(prev => prev.map(cap => 
        cap.id === id ? { ...cap, enabled } : cap
      ))
    } finally {
      setLoading(null)
    }
  }

  // 连接外部服务
  const connectService = async (id: string) => {
    setLoading(id)
    // 实际实现：跳转到 OAuth 授权页面
    alert(`即将跳转到 ${id} 授权页面`)
    setLoading(null)
  }

  // 按分类分组
  const grouped = capabilities.reduce((acc, cap) => {
    if (!acc[cap.category]) acc[cap.category] = []
    acc[cap.category].push(cap)
    return acc
  }, {} as Record<string, CapabilityItem[]>)

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, caps]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            {category}
          </h3>
          <div className="space-y-3">
            {caps.map(cap => (
              <div 
                key={cap.id}
                className="bg-white rounded-lg border p-4 flex items-center justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                    {ICONS[cap.icon] || <Settings className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{cap.name}</h4>
                      {cap.type === 'integration' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          外部
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{cap.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* 外部服务连接按钮 */}
                  {cap.type === 'integration' && cap.enabled && (
                    <button
                      onClick={() => connectService(cap.id)}
                      disabled={loading === cap.id || cap.connected}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                        cap.connected 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {cap.connected ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          已连接
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <ExternalLink className="w-3.5 h-3.5" />
                          连接
                        </span>
                      )}
                    </button>
                  )}

                  {/* 启用/禁用开关 */}
                  {cap.configurable && (
                    <button
                      onClick={() => toggleCapability(cap.id, !cap.enabled)}
                      disabled={loading === cap.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        cap.enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          cap.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}

                  {/* 不可配置但已启用 */}
                  {!cap.configurable && cap.enabled && (
                    <span className="text-xs text-gray-400">默认启用</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* iOS Shortcut 设置 */}
      <div className="pt-4 border-t bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">iOS 屏幕时间自动上报</h4>
        <p className="text-sm text-blue-700 mb-3">
          使用 iOS Shortcut 自动上报每日屏幕时间数据
        </p>
        <ol className="text-sm text-blue-600 space-y-1 list-decimal list-inside">
          <li>在设置中启用"屏幕时间分析"能力</li>
          <li>获取你的 API Key（首次启用后显示）</li>
          <li>下载 iOS Shortcut（链接稍后提供）</li>
          <li>设置自动化：每天 23:59 运行</li>
        </ol>
      </div>

      {/* 添加自定义 API */}
      <div className="pt-4 border-t">
        <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
          <Plus className="w-4 h-4" />
          添加自定义 API
        </button>
        <p className="text-xs text-gray-500 mt-1">
          接入你自己的 API，让 Clover 获得更多能力
        </p>
      </div>
    </div>
  )
}

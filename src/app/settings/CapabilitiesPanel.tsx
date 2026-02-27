'use client'

import { useState, useEffect } from 'react'
import { 
  Image, 
  Code, 
  Calendar, 
  Clock, 
  ExternalLink, 
  ToggleLeft, 
  ToggleRight,
  Plus,
  Settings,
  Zap
} from 'lucide-react'

interface Capability {
  id: string
  name: string
  description: string
  type: 'builtin' | 'integration' | 'user-api'
  enabled: boolean
  configurable: boolean
  icon: string
}

export function CapabilitiesPanel() {
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'available'>('active')

  useEffect(() => {
    fetchCapabilities()
  }, [])

  const fetchCapabilities = async () => {
    try {
      const res = await fetch('/api/capabilities')
      const data = await res.json()
      setCapabilities(data.capabilities || [])
    } catch (error) {
      console.error('Failed to fetch capabilities:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCapability = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capabilityId: id, enabled }),
      })
      
      if (res.ok) {
        setCapabilities(prev => 
          prev.map(cap => 
            cap.id === id ? { ...cap, enabled } : cap
          )
        )
      }
    } catch (error) {
      console.error('Failed to toggle capability:', error)
    }
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'image': return <Image className="w-5 h-5" />
      case 'code': return <Code className="w-5 h-5" />
      case 'calendar': return <Calendar className="w-5 h-5" />
      case 'clock': return <Clock className="w-5 h-5" />
      default: return <Zap className="w-5 h-5" />
    }
  }

  const activeCapabilities = capabilities.filter(c => c.enabled)
  const availableCapabilities = capabilities.filter(c => !c.enabled)

  if (loading) {
    return <div className="text-center py-8 text-gray-400">加载中...</div>
  }

  return (
    <div className="space-y-6">
      {/* 标签页 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'active' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          已启用 ({activeCapabilities.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'available' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          可添加 ({availableCapabilities.length})
        </button>
      </div>

      {/* 能力列表 */}
      <div className="space-y-3">
        {(activeTab === 'active' ? activeCapabilities : availableCapabilities).map(cap => (
          <div 
            key={cap.id}
            className="bg-white rounded-lg border p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              {getIcon(cap.icon)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{cap.name}</h3>
                {cap.type === 'builtin' && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">内置</span>
                )}
                {cap.type === 'integration' && (
                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded">集成</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{cap.description}</p>
            </div>

            <div className="flex items-center gap-2">
              {cap.configurable && (
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                  <Settings className="w-4 h-4" />
                </button>
              )}
              
              {activeTab === 'active' ? (
                cap.configurable ? (
                  <button
                    onClick={() => toggleCapability(cap.id, false)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <ToggleRight className="w-6 h-6" />
                  </button>
                ) : (
                  <span className="text-xs text-gray-400 px-2">必选</span>
                )
              ) : (
                <button
                  onClick={() => toggleCapability(cap.id, true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  启用
                </button>
              )}
            </div>
          </div>
        ))}

        {(activeTab === 'active' ? activeCapabilities : availableCapabilities).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            {activeTab === 'active' ? '还没有启用的能力' : '没有可添加的能力'}
          </div>
        )}
      </div>

      {/* 添加自定义 API */}
      <div className="pt-4 border-t">
        <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors">
          <ExternalLink className="w-4 h-4" />
          连接外部服务或 API
        </button>
      </div>
    </div>
  )
}

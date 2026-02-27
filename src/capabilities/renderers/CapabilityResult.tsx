// 统一结果渲染组件
// 根据 renderType 自动选择渲染器

'use client';

import { useState } from 'react';
import { Action } from '../types';

interface CapabilityResultProps {
  renderType: string;
  data: any;
  actions?: Action[];
  onAction?: (action: Action) => void;
}

export function CapabilityResult({ 
  renderType, 
  data, 
  actions, 
  onAction 
}: CapabilityResultProps) {
  switch (renderType) {
    case 'image':
      return <ImageRenderer src={data} actions={actions} onAction={onAction} />;
    case 'iframe':
      return <IframeRenderer src={data.previewUrl || data} actions={actions} onAction={onAction} />;
    case 'code':
      return <CodeRenderer code={data.code || data} actions={actions} onAction={onAction} />;
    case 'card':
      return <CardRenderer data={data} actions={actions} onAction={onAction} />;
    default:
      return <TextRenderer content={data} />;
  }
}

// 图片渲染
function ImageRenderer({ 
  src, 
  actions, 
  onAction 
}: { 
  src: string; 
  actions?: Action[]; 
  onAction?: (action: Action) => void;
}) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg overflow-hidden bg-gray-100">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <img 
          src={src} 
          alt="Generated"
          className="max-w-full h-auto"
          onLoad={() => setLoading(false)}
        />
      </div>
      
      {actions && actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => onAction?.(action)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Iframe 渲染（网页预览）
function IframeRenderer({ 
  src, 
  actions, 
  onAction 
}: { 
  src: string; 
  actions?: Action[]; 
  onAction?: (action: Action) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
        <iframe 
          src={src} 
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      
      {actions && actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => onAction?.(action)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 代码渲染
function CodeRenderer({ 
  code, 
  actions, 
  onAction 
}: { 
  code: string; 
  actions?: Action[]; 
  onAction?: (action: Action) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-auto max-h-96 text-sm">
          <code>{code}</code>
        </pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      
      {actions && actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => onAction?.(action)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 卡片渲染（结构化数据）
function CardRenderer({ 
  data, 
  actions, 
  onAction 
}: { 
  data: any; 
  actions?: Action[]; 
  onAction?: (action: Action) => void;
}) {
  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      {data.title && (
        <h3 className="font-semibold text-lg">{data.title}</h3>
      )}
      {data.description && (
        <p className="text-gray-600 text-sm">{data.description}</p>
      )}
      {data.content && (
        <div className="text-sm">{data.content}</div>
      )}
      
      {actions && actions.length > 0 && (
        <div className="flex gap-2 pt-2 border-t">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => onAction?.(action)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 纯文本渲染
function TextRenderer({ content }: { content: string }) {
  return <div className="whitespace-pre-wrap">{content}</div>;
}

// Clover 隐式能力系统 - 核心类型定义

export type CapabilityType = 'builtin' | 'integration' | 'user-api';

export type RenderType = 'image' | 'iframe' | 'code' | 'card' | 'text' | 'markdown';

export interface Parameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  required: boolean;
  description: string;
  enum?: string[];
}

export interface IntentConfig {
  patterns: RegExp[];
  aiDescription: string;
  examples: string[];
}

export interface RenderConfig {
  type: RenderType;
  options?: {
    allowDownload?: boolean;
    allowRegenerate?: boolean;
    allowDeploy?: boolean;
    allowEdit?: boolean;
    showCode?: boolean;
    height?: string;
  };
}

export interface PermissionConfig {
  requireAuth: boolean;
  plan: ('free' | 'pro')[];
  userConfigurable: boolean;  // 用户可启用/禁用
  defaultEnabled?: boolean;   // 默认是否启用
}

export interface ExecutionContext {
  userId: string;
  sessionId: string;
  userPlan: string;
  memory: any;
  messages: any[];  // 当前对话上下文
}

export interface Action {
  id: string;
  label: string;
  type: 'retry' | 'modify' | 'open' | 'deploy' | 'custom';
  payload?: any;
}

export interface ExecutionResult {
  success: boolean;
  data: any;
  error?: string;
  metadata?: {
    title?: string;
    description?: string;
    actions?: Action[];
  };
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  type: CapabilityType;
  intent: IntentConfig;
  parameters: Parameter[];
  render: RenderConfig;
  execute: (params: any, context: ExecutionContext) => Promise<ExecutionResult>;
  permissions: PermissionConfig;
}

// 用户配置的能力启用状态
export interface UserCapabilityConfig {
  capabilityId: string;
  enabled: boolean;
  config?: Record<string, any>;  // 外部API的配置（如API Key、端点等）
  connected?: boolean;  // 外部服务是否已连接（OAuth等）
}

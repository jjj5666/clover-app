// Clover 能力执行引擎
// 意图识别 → 参数提取 → 执行 → 结果返回

import { registry } from './registry';
import { Capability, ExecutionContext, ExecutionResult } from './types';

export interface ProcessResult {
  matched: boolean;
  capabilityId?: string;
  result?: ExecutionResult;
  renderType?: string;
  error?: string;
}

export class CapabilityEngine {
  private aiClassifier: (input: string, descriptions: string[]) => Promise<string>;
  private paramExtractor: (input: string, params: any[]) => Promise<Record<string, any>>;

  constructor(
    aiClassifier: (input: string, descriptions: string[]) => Promise<string>,
    paramExtractor: (input: string, params: any[]) => Promise<Record<string, any>>
  ) {
    this.aiClassifier = aiClassifier;
    this.paramExtractor = paramExtractor;
  }

  // 处理用户输入
  async process(userInput: string, context: ExecutionContext): Promise<ProcessResult> {
    try {
      // 1. 规则快速筛选候选
      const candidates = registry.findCandidates(userInput);

      if (candidates.length === 0) {
        return { matched: false };
      }

      // 2. AI精确选择（多候选时）
      const capability = await registry.selectBestMatch(
        userInput,
        candidates,
        this.aiClassifier
      );

      if (!capability) {
        return { matched: false };
      }

      // 3. 权限检查
      if (capability.permissions.requireAuth && !context.userId) {
        return {
          matched: true,
          capabilityId: capability.id,
          error: '需要登录才能使用此功能',
        };
      }

      // 4. 参数提取
      const params = await this.paramExtractor(
        userInput,
        capability.parameters
      );

      // 5. 执行能力
      const result = await capability.execute(params, context);

      return {
        matched: true,
        capabilityId: capability.id,
        result,
        renderType: capability.render.type,
      };
    } catch (error: any) {
      return {
        matched: true,
        error: error.message || '执行失败',
      };
    }
  }
}

// 工厂函数
export function createEngine(
  apiKey: string
): CapabilityEngine {
  const aiClassifier = async (input: string, descriptions: string[]): Promise<string> => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: [
          {
            role: 'system',
            content: `你是意图分类器。从以下能力中选择最匹配用户输入的一个，只返回能力ID。\n\n可选能力：\n${descriptions.join('\n')}`,
          },
          { role: 'user', content: input },
        ],
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || descriptions[0].split(':')[0];
  };

  const paramExtractor = async (input: string, params: any[]): Promise<Record<string, any>> => {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: [
          {
            role: 'system',
            content: `从用户输入中提取参数。返回JSON格式。\n参数定义：${JSON.stringify(params)}`,
          },
          { role: 'user', content: input },
        ],
      }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    try {
      // 尝试从Markdown代码块中提取
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```([\s\S]*?)```/) ||
                        [null, content];
      return JSON.parse(jsonMatch[1] || content);
    } catch {
      return {};
    }
  };

  return new CapabilityEngine(aiClassifier, paramExtractor);
}

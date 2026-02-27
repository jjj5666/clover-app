// Clover 能力注册中心
// 管理所有能力：内置、外部集成、用户自定义API

import { Capability, UserCapabilityConfig } from './types';

class CapabilityRegistry {
  private capabilities: Map<string, Capability> = new Map();
  private userConfigs: Map<string, UserCapabilityConfig> = new Map();

  // 注册能力（系统启动时调用）
  register(capability: Capability) {
    this.capabilities.set(capability.id, capability);
    
    // 默认启用配置
    if (capability.permissions.defaultEnabled !== false) {
      this.userConfigs.set(capability.id, {
        capabilityId: capability.id,
        enabled: true,
      });
    }
  }

  // 获取所有能力
  getAll(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  // 获取单个能力
  get(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  // 获取用户已启用的能力
  getEnabledForUser(userConfig: UserCapabilityConfig[]): Capability[] {
    const enabledIds = new Set(
      userConfig.filter(c => c.enabled).map(c => c.capabilityId)
    );
    
    return this.getAll().filter(cap => {
      // 内置且不可配置的，始终启用
      if (cap.type === 'builtin' && !cap.permissions.userConfigurable) {
        return true;
      }
      // 其他的根据用户配置
      return enabledIds.has(cap.id);
    });
  }

  // 意图匹配：规则快速筛选
  findCandidates(userInput: string): Capability[] {
    return this.getAll().filter(cap =>
      cap.intent.patterns.some(pattern => pattern.test(userInput))
    );
  }

  // AI精确识别（多候选时）
  async selectBestMatch(
    userInput: string,
    candidates: Capability[],
    aiClassifier: (input: string, descriptions: string[]) => Promise<string>
  ): Promise<Capability | null> {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    const descriptions = candidates.map(c =>
      `${c.id}: ${c.intent.aiDescription}`
    );

    const bestMatchId = await aiClassifier(userInput, descriptions);
    return this.capabilities.get(bestMatchId) || candidates[0];
  }
}

// 全局单例
export const registry = new CapabilityRegistry();

// 导出注册函数（方便各能力文件使用）
export function registerCapability(capability: Capability) {
  registry.register(capability);
}

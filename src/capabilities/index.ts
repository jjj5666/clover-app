// Clover 能力系统自动加载入口
// 导入此文件即注册所有内置能力

// 渲染组件导出
export { CapabilityResult } from './renderers/CapabilityResult';

// 核心导出
export { registry, registerCapability } from './registry';
export { createEngine, CapabilityEngine } from './engine';
export * from './types';

// 注册内置能力（导入即注册）
import './providers/image-generation';
import './providers/builder';
import './providers/daily-review';
import './providers/screen-time';
import './providers/daily-review';
import './providers/screen-time';

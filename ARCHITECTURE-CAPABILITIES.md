# Clover 隐式能力系统架构

> 记录时间：2026-02-27
> 核心原则：用户不感知功能存在，只输入意图，AI 直接交付结果

---

## 核心设计理念

### 隐式 > 显式
- ❌ 传统：用户必须知道有 Builder 页面，主动访问
- ✅ Clover：用户说"做个网页"→自动识别→生成→内嵌交付

### 能力发现
- 不是给用户功能列表
- 而是让用户探索"Clover 能帮我做什么"
- 通过欢迎语、示例、渐进式引导

### 统一架构
- 自营功能、外部服务、用户自定义 API → 统一抽象为"能力"
- 用户视角：都是"Clover 的能力"
- 技术视角：通过 Capability Registry 统一管理

---

## 架构层级

```
用户输入
    ↓
意图识别（AI+规则双引擎）
    ↓
能力匹配（Capability Registry）
    ↓
参数提取（AI自动）
    ↓
执行（统一API调用）
    ↓
结果渲染（组件自动选择）
    ↓
聊天内交付 + 可交互Action
```

---

## 能力类型

### 1. 内置能力（Builtin）
- 图片生成
- Builder（生成网页/应用）
- 每日回顾
- 屏幕时间分析
- 记忆查询

### 2. 外部集成（Integration）
- Notion 查询/写入
- GitHub 操作
- 日历/邮件
- Twitter/X 发布

### 3. 用户自定义 API（User API）
- 用户配置任意 API 端点
- Clover 自动封装为能力
- 用户感知："增加了一个能力"

---

## 能力发现页面设计

### 页面结构
```
我的能力（Capabilities）
├── 已启用（Active）
│   ├── 图片生成 [默认] [不可禁用]
│   ├── 网页生成 [默认] [不可禁用]
│   ├── 每日回顾 [默认] [可开关]
│   └── Notion [外部] [已连接] [设置]
├── 可添加（Available）
│   ├── 屏幕时间分析 [内置]
│   ├── GitHub 操作 [外部]
│   └── 自定义 API [通用]
└── 发现更多（Discover）
    └── 市场/推荐
```

### 用户交互
- 启用/禁用：开关控制
- 外部服务：OAuth 连接（如 Notion）
- 自定义 API：表单配置（URL、Key、描述）

---

## 核心类型定义

```typescript
interface Capability {
  id: string;
  name: string;           // 用户可见名称
  description: string;    // 功能描述
  type: 'builtin' | 'integration' | 'user-api';
  
  intent: {
    patterns: RegExp[];           // 快速匹配规则
    aiDescription: string;        // AI识别描述
    examples: string[];           // 触发示例
  };
  
  parameters: Parameter[];        // 参数定义（AI自动提取）
  
  render: {
    type: 'image' | 'iframe' | 'code' | 'card' | 'text';
    options: RenderOptions;
  };
  
  execute: (params, context) => Promise<Result>;
  
  permissions: {
    requireAuth: boolean;
    plan: ('free' | 'pro')[];
    userConfigurable: boolean;    // 用户可启用/禁用
  };
}
```

---

## 改造计划

### Phase 1：架构搭建
- [ ] 创建 `src/capabilities/` 目录结构
- [ ] 定义核心类型
- [ ] 实现 Capability Registry
- [ ] 实现意图识别引擎

### Phase 2：现有功能改造
- [ ] 图片生成 → 新架构
- [ ] Builder → 新架构（聊天内嵌）
- [ ] 移除独立 Builder 页面（或改为展示页）

### Phase 3：能力发现页面
- [ ] 能力列表页面
- [ ] 启用/禁用开关
- [ ] 外部服务连接流程
- [ ] 自定义 API 配置

### Phase 4：新能力
- [ ] 每日回顾
- [ ] 屏幕时间接入
- [ ] Notion/GitHub 等外部集成

---

## 关键决策记录

### 为什么不用 /command？
- 增加记忆负担
- 不符合自然语言习惯
- 隐式触发更优雅

### 结果渲染在聊天内？
- 保持上下文连续性
- 可以随时追问、修改
- 符合对话式交互

### 能力可配置？
- 用户不需要的能力可以隐藏（减少干扰）
- 外部服务需要授权（用户控制）
- 自定义 API 完全用户掌控

---

## 待解决问题

1. **能力冲突**：多个能力匹配同一意图时的优先级
2. **错误处理**：能力执行失败如何优雅降级
3. **上下文保持**：多轮修改时如何记住状态
4. **计费统计**：按能力维度统计用量和成本

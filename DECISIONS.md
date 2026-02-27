# Clover 设计决策记录

> 每次重要讨论后更新。新session开始前必读。

---

## 2026-02-27 记忆系统设计

### 记忆以产品需求为本而非学术基准
- multi-session推理是学术指标，不是产品指标
- 用户真正需要的：记得我是谁、身边有谁、最近发生什么、不说矛盾的话
- 不追LongMemEval分数，追用户体验

### 记忆用Markdown文本，不用结构化表
- 自然语言信息密度高于结构化字段
- "最近减少肉食但偶尔还是会吃" 比 `diet: 素食者` 信息量大得多
- 预设维度会限制未来扩展
- LLM天然能读懂文本，不需要SQL→文本转换
- 该结构化的只有时间索引

### Session先存2天，不是7天
- 用数据验证再扩展，不要预设
- 2天内覆盖大多数"我昨天说了什么"需求
- 超过2天靠每日摘要

### 重新写Clover，不爆改OpenClaw
- OpenClaw是本地Agent框架（Node.js + 文件系统 + Gateway），架构假设完全不同
- Clover是云端SaaS（Next.js + Supabase + 多租户）
- 爆改的理解成本比重新写更高
- MVP只需6个模块，从零更快
- 但学习OpenClaw的设计思路（SOUL/USER、Session管理）

### 关系存储不需要图数据库
- 普通用户高频联系人不超过20个
- 一张关系表 + JSONB 够用
- 图数据库（Neo4j）引入的复杂度远高于收益

### Observer不在MVP做实时运行
- MVP阶段：每天23:59用Kimi Flash生成当日摘要
- Phase 2：Observer实时后台运行
- 原因：实时Observer的prompt调优工作量大，MVP先跑通流程

### 自动提取MVP不做，先手动
- 用户画像Phase 1靠用户在设置页填写 + 对话中AI提取简单事实
- 复杂自动提取（偏好推断、态度变化）是Phase 2
- 不加确认机制的自动提取会导致信任崩塌

## 2026-02-27 开发方式

### 工作流
- jjj（产品决策）→ 小鸡（架构+任务拆解）→ Claude Code（写代码）→ 小鸡（review）→ jjj（测试）
- 小步迭代，每步可验证
- Claude Code擅长单模块任务，不让它一次写整个系统

### 模型选择
- 架构设计：Opus
- 编码：Sonnet 4.6（和Opus写代码能力持平，便宜5倍）
- 日常对话：Kimi K2.5

---

## 2026-02-27 参考的研究

### 采纳的方案
- MemoryOS的骨架：三层分层 + 热度机制 + 层间转换规则
- Observational Memory的灵魂：Observer压缩 + 时间三层锚定 + 上下文稳定
- Supermemory的关系版本控制思路（updates/extends/derives）→ Phase 3

### 参考但不采纳的
- Mem0：对比基准弱、GPT-4o-mini提取质量不够
- A-Mem：Zettelkasten好但写入成本太高
- 图数据库方案：过度工程化

### 关键论文
- Observational Memory (Mastra, 2025) — LongMemEval SOTA 94.87%
- MemoryOS (EMNLP 2025 Oral, 腾讯) — 三层架构设计
- Anatomy of Agentic Memory (2026-02-22) — 最新综述，揭示benchmark饱和问题
- Mem0 (2025) — 理解增量记忆的基本思路

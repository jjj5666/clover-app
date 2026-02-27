# CLAUDE.md - Claude Code 项目指南

> Claude Code每次启动自动读取此文件。

## 项目概述
Clover是一个面向普通人的AI助手Web应用，核心差异化是记忆系统。
用户不需要任何配置，AI自动记住用户是谁、聊过什么。

## 技术栈
- Next.js 15（App Router）
- React + TailwindCSS
- Supabase（PostgreSQL + pgvector + Auth）
- OpenRouter API（AI模型）
- TypeScript
- Vercel部署

## 代码规范
- TypeScript严格模式
- 组件用函数式，不用class
- API Routes用Next.js App Router格式（route.ts）
- 数据库操作全部通过Supabase client
- 环境变量放.env.local，不提交git
- 中文注释，英文代码

## 文件结构
读 ARCHITECTURE.md 了解完整结构。

## 禁止事项
- 不要安装不必要的依赖，先用内置方案
- 不要用ORM（Prisma/Drizzle），直接用Supabase client
- 不要过度抽象，MVP阶段宁可重复也不要premature abstraction
- 不要自己实现Auth，用Supabase Auth
- 不要自己管理WebSocket，用Supabase Realtime或SSE

## 关键设计决策
读 DECISIONS.md 了解所有设计决策和原因。

## 开发进度
读 PROGRESS.md 了解当前进度。从未完成的下一项开始。

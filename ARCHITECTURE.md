# Clover 技术架构

> Claude Code写代码前必读。小鸡维护此文件。

---

## 技术栈

- 前端：Next.js 15 + React + TailwindCSS
- 后端：Next.js API Routes
- 数据库：Supabase（PostgreSQL + pgvector + Auth + Realtime）
- AI：OpenRouter（统一接口调所有模型）
- 部署：Vercel + Supabase Cloud
- 支付：Lemon Squeezy

## 核心模块（6个）

### 1. Auth
- Supabase Auth，支持Google OAuth
- 每个用户一个独立的记忆空间

### 2. Chat
- 流式回复（Server-Sent Events）
- 消息存储在 Supabase

### 3. Agent Engine
- 构造context：系统提示 + 用户画像 + 最近摘要 + 当前消息
- 调用OpenRouter API
- 返回流式回复

### 4. Model Router
- 简单分类：消息长度 + 关键词判断复杂度
- 简单问题 → Kimi K2.5（$0.14/M）
- 复杂问题 → Sonnet 4.6（$3/$15/M）

### 5. Memory（三层）
- 短期（Working）：当前session + 前2天完整session
- 中期（Experience）：每日摘要，Markdown文本，向量化，90天
- 长期（Identity）：用户画像文本 + 关系记录，永久

### 6. Billing
- Lemon Squeezy webhook
- Free：20条/天
- Pro $9.9/月：无限

## 数据模型

```sql
-- 用户画像（Markdown文本，不是结构化字段）
CREATE TABLE user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  content TEXT,  -- Markdown格式的画像文本
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 对话session
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 消息
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions NOT NULL,
  role TEXT NOT NULL,  -- 'user' / 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 每日摘要
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL,
  summary TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- 用户关系（简单表，不用图数据库）
CREATE TABLE user_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  type TEXT,        -- 'person' / 'company' / 'project'
  relation TEXT,    -- '同事' / '朋友' / '家人'
  notes TEXT,       -- 自由文本备注
  last_mentioned_at TIMESTAMPTZ,
  mention_count INT DEFAULT 1
);

-- 订阅状态
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  plan TEXT DEFAULT 'free',  -- 'free' / 'pro'
  lemon_squeezy_id TEXT,
  expires_at TIMESTAMPTZ
);
```

## 上下文构造（Agent Engine核心逻辑）

每次对话时拼接的prompt：

```
[system_prompt]          ~500 token（固定）
[user_memory.content]    ~500 token（用户画像Markdown）
[yesterday_summary]      ~800 token（昨日摘要）
[day_before_summary]     ~800 token（前日摘要）
[current_messages]       变长

总额外overhead：~2600 token/次
Kimi K2.5成本：~$0.0004/次
每用户100条/天：~$0.04/天 → $1.2/月
```

## 文件结构

```
clover/
├── CLAUDE.md
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing
│   │   ├── chat/page.tsx         # 对话页
│   │   ├── settings/page.tsx     # 设置/记忆面板
│   │   └── api/
│   │       ├── chat/route.ts     # 对话API
│   │       ├── memory/route.ts   # 记忆CRUD
│   │       └── billing/route.ts  # 订阅webhook
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── router.ts        # 模型路由器
│   │   │   └── agent.ts         # Agent引擎
│   │   ├── memory/
│   │   │   ├── profile.ts       # 用户画像
│   │   │   ├── summary.ts       # 每日摘要
│   │   │   └── session.ts       # Session管理
│   │   └── supabase/
│   │       └── client.ts
│   └── components/
│       ├── ChatWindow.tsx
│       ├── MessageBubble.tsx
│       └── MemoryPanel.tsx
├── supabase/
│   └── migrations/
└── package.json
```

## 开发计划

### Week 1：能跑
- Day 1：项目初始化 + Auth
- Day 2：对话界面 + 流式API
- Day 3：模型路由器
- Day 4：记忆v1（用户画像）
- Day 5：记忆v2（每日摘要 + 2天session）

### Week 2：能收费
- Day 6：记忆面板
- Day 7：订阅系统
- Day 8：限额
- Day 9：UI打磨
- Day 10：部署上线

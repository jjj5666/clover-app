# Clover - AI Assistant with Automatic Memory

An AI assistant that **remembers who you are** across sessions, without any configuration. Unlike ChatGPT or Claude, Clover automatically builds a persistent memory of your identity, preferences, and conversation history.

## Problem

Every time you open ChatGPT, you start from scratch. The AI doesn't know your name, your job, what you talked about yesterday, or what matters to you. You end up repeating context over and over. For people who want a daily AI companion, this is a terrible experience.

## Solution

Clover is an AI assistant with a **3-layer automatic memory system**:

- **Working Memory** — current session context, what you're talking about right now
- **Experience Memory** — daily summaries stored with vector search, so the AI recalls past conversations naturally
- **Identity Memory** — your profile, relationships, preferences, automatically extracted and updated over time

The AI gets smarter the more you use it. It knows your name, remembers your projects, understands your communication style, and can reference things you discussed weeks ago.

## Key Features

- **Smart Model Routing** — cheap model (Kimi K2.5) for simple queries, Claude Sonnet for complex ones, saving cost without sacrificing quality
- **AI Image Generation** — generate images via Gemini through natural conversation
- **App Builder** — describe an app in chat, AI generates and deploys it to Vercel
- **Daily Review** — automatic daily summaries of your conversations and insights
- **Streaming Responses** — real-time SSE streaming for fast, responsive chat

## Tech Stack

- Next.js 16 (App Router)
- Supabase (Auth + PostgreSQL + Vector Search)
- OpenRouter (multi-model: GPT-5.4, Claude Sonnet 4.6, Kimi K2.5, Gemini)
- Tailwind CSS 4
- TypeScript
- Lemon Squeezy (billing: Free / Pro $9.9/mo)

## Architecture

```
User Input → Model Router (cheap vs complex)
                ↓
         Chat Response (streaming SSE)
                ↓
         Memory Pipeline:
         ├── Working Memory (session context)
         ├── Experience Memory (daily summaries → vector DB)
         └── Identity Memory (user profile extraction)
```

## Getting Started

```bash
cp .env.example .env.local
# Fill in: OPENROUTER_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
npm install
npm run dev
```

## License

MIT

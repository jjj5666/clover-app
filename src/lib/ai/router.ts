// 模型路由器：根据消息复杂度选择最合适的模型
// 简单问题用便宜模型，复杂问题用强力模型

// 触发复杂模型的关键词（英文 + 中文）
const COMPLEX_KEYWORDS = [
  'analyze',
  'explain',
  'compare',
  'design',
  'write code',
  'debug',
  '分析',
  '解释',
  '对比',
  '设计',
  '写代码',
  '调试',
  '帮我写',
  '详细',
]

// 对话总字符数超过此阈值视为复杂
const COMPLEX_LENGTH_THRESHOLD = 2000

// 复杂问题用 Sonnet，简单问题用 Kimi K2.5（成本低 20 倍）
const MODEL_COMPLEX = 'anthropic/claude-sonnet-4.6'
const MODEL_SIMPLE = 'moonshotai/kimi-k2.5'

export function selectModel(messages: { role: string; content: string }[]): string {
  const userMessages = messages.filter((m) => m.role === 'user')

  // 统计所有用户消息的总字符数
  const totalChars = userMessages.reduce((sum, m) => sum + m.content.length, 0)

  // 长对话直接走复杂模型
  if (totalChars > COMPLEX_LENGTH_THRESHOLD) {
    return MODEL_COMPLEX
  }

  // 检查最后一条用户消息是否含有复杂关键词
  const lastUserMessage = userMessages.at(-1)
  if (lastUserMessage) {
    const content = lastUserMessage.content.toLowerCase()
    const isComplex = COMPLEX_KEYWORDS.some((kw) => content.includes(kw.toLowerCase()))
    if (isComplex) {
      return MODEL_COMPLEX
    }
  }

  return MODEL_SIMPLE
}

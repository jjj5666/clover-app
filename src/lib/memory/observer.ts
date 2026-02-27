// Observer：压缩和整理记忆
// 当记忆条目过多时，合并重复、删除过时、按类别整理

export async function compressMemory(
  existingMemory: string,
  apiKey: string
): Promise<string> {
  if (!existingMemory || existingMemory.split('\n').filter(l => l.trim().startsWith('- ')).length < 8) {
    // 条目少于8条不需要压缩
    return existingMemory
  }

  try {
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
            content: `你是一个记忆整理器。把下面的记忆条目整理成清晰、无重复的列表。

规则：
1. 合并重复或相似的条目（如"用户在做Clover"和"用户正在开发Clover项目"合并为一条）
2. 删除已过时的信息（如果有更新的版本）
3. 按以下类别分组，每个类别用 ## 标题：
   ## 身份
   ## 偏好
   ## 目标与项目
   ## 身边的人
   ## 其他
4. 每条以 - 开头
5. 空的类别不要显示
6. 只返回整理后的文本，不要解释`,
          },
          { role: 'user', content: existingMemory },
        ],
      }),
    })

    const data = await res.json()
    const compressed = data.choices?.[0]?.message?.content?.trim()
    return compressed || existingMemory
  } catch {
    return existingMemory
  }
}

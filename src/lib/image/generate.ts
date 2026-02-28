// Image generation using OpenRouter (Gemini 3.1 Flash Image)

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function generateImage(
  prompt: string,
  apiKey: string
): Promise<{ imageData: string; mimeType: string }> {
  const res = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://clover.app',
      'X-Title': 'Clover',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Generate an image: ${prompt}` }
          ]
        }
      ]
    })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Image generation failed: ${error}`)
  }

  const data = await res.json()
  
  // Extract image from response
  // OpenRouter/Gemini returns image in content as markdown or direct base64
  const message = data.choices?.[0]?.message
  if (!message) {
    throw new Error('No response from image model')
  }

  // Check for image content in parts (new format)
  if (message.content && Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === 'image_url' && part.image_url?.url) {
        const url = part.image_url.url
        if (url.startsWith('data:image')) {
          const parts = url.split(',')
          const mimeMatch = parts[0].match(/data:([^;]+)/)
          return {
            imageData: parts[1],
            mimeType: mimeMatch?.[1] || 'image/png'
          }
        }
      }
    }
  }

  // Fallback: check content as string
  const content = typeof message.content === 'string' ? message.content : ''
  
  // Parse base64 image from markdown: ![...](data:image/png;base64,...)
  const base64Match = content.match(/data:image\/([a-z]+);base64,([A-Za-z0-9+/=]+)/)
  if (base64Match) {
    return {
      imageData: base64Match[2],
      mimeType: `image/${base64Match[1]}`
    }
  }

  // Alternative: content might be direct base64
  if (content.startsWith('data:image')) {
    const parts = content.split(',')
    const mimeMatch = parts[0].match(/data:([^;]+)/)
    return {
      imageData: parts[1],
      mimeType: mimeMatch?.[1] || 'image/png'
    }
  }

  throw new Error('No image generated in response')
}

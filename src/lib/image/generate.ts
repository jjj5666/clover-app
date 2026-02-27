// Image generation using Gemini 3 Pro Image API (Nano Banana Pro)

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent'

export async function generateImage(
  prompt: string,
  apiKey: string
): Promise<{ imageData: string; mimeType: string }> {
  const url = `${GEMINI_API_URL}?key=${apiKey}`
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `Generate an image: ${prompt}` }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ['Text', 'Image']
      }
    })
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Image generation failed: ${error}`)
  }

  const data = await res.json()
  
  // Extract image from response
  const candidates = data.candidates || []
  for (const candidate of candidates) {
    const parts = candidate.content?.parts || []
    for (const part of parts) {
      if (part.inlineData?.data) {
        return {
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/png'
        }
      }
    }
  }

  throw new Error('No image generated')
}

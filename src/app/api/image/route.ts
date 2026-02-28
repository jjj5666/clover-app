import { NextRequest } from 'next/server'
import { generateImage } from '@/lib/image/generate'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Prompt required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Image generation not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // 支持多语言：Gemini 原生支持中文、英文、日文等
    const { imageData, mimeType } = await generateImage(prompt, apiKey)
    
    // 保存到数据库（可选）
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('generated_images').insert({
        user_id: user.id,
        prompt,
        image_data: imageData,
        mime_type: mimeType,
      })
    }

    return new Response(JSON.stringify({
      imageData,
      mimeType,
      prompt
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

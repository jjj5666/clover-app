import { NextRequest } from 'next/server'
import { BUILDER_SYSTEM_PROMPT, BUILDER_USER_PROMPT_TEMPLATE } from '@/lib/builder/prompts'
import { deployApp } from '@/lib/builder/deploy'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { description } = await req.json()
  
  if (!description) {
    return new Response(JSON.stringify({ error: 'Description required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // 1. 用 AI 生成代码
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (!openRouterKey) {
      throw new Error('OpenRouter API key not configured')
    }

    const codeRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.6',
        messages: [
          { role: 'system', content: BUILDER_SYSTEM_PROMPT },
          { role: 'user', content: BUILDER_USER_PROMPT_TEMPLATE(description) },
        ],
        temperature: 0.7,
      }),
    })

    if (!codeRes.ok) {
      throw new Error(`Code generation failed: ${await codeRes.text()}`)
    }

    const codeData = await codeRes.json()
    const generatedCode = codeData.choices?.[0]?.message?.content?.trim()
    
    if (!generatedCode) {
      throw new Error('No code generated')
    }

    // 2. 部署到 Vercel（如果有 token）
    const vercelToken = process.env.VERCEL_TOKEN
    let deployUrl: string | null = null
    let deployId: string | null = null

    if (vercelToken) {
      const timestamp = Date.now()
      const projectName = `clover-app-${timestamp}`
      
      try {
        const deployResult = await deployApp(generatedCode, projectName, vercelToken)
        deployUrl = deployResult.url
        deployId = deployResult.id
      } catch (deployError) {
        console.error('Deploy error:', deployError)
        // 部署失败但代码已生成
      }
    }

    // 保存到数据库（如果用户已登录）
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('builder_projects').insert({
        user_id: user.id,
        description,
        code: generatedCode,
        deploy_url: deployUrl,
        deploy_id: deployId,
      })
    }

    return new Response(JSON.stringify({
      code: generatedCode,
      deployUrl,
      deployId,
      preview: !deployUrl // 如果部署失败，需要预览
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

// 检查部署状态
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const deployId = searchParams.get('deployId')
  
  if (!deployId) {
    return new Response(JSON.stringify({ error: 'Deploy ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const vercelToken = process.env.VERCEL_TOKEN
  if (!vercelToken) {
    return new Response(JSON.stringify({ error: 'Vercel token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { checkDeployStatus } = await import('@/lib/builder/deploy')
    const status = await checkDeployStatus(deployId, vercelToken)
    
    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

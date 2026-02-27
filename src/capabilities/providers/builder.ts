// Builder 能力 - 新架构（隐式触发）
// 用户说"做网页/建网站/生成应用"→自动识别→生成→内嵌预览

import { registerCapability } from '../registry';
import { ExecutionContext, ExecutionResult } from '../types';

// 生成代码的辅助函数
async function generateCode(description: string, apiKey: string): Promise<string> {
  const BUILDER_SYSTEM_PROMPT = `You are a web app generator.
Rules:
1. Generate a complete, working React app using TypeScript and Tailwind CSS
2. Use Lucide React for icons
3. Write clean, readable code
4. Make the UI beautiful and responsive
5. Save data to localStorage if needed
6. Export default function App

Output ONLY the code, no markdown, no explanation.`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [
        { role: 'system', content: BUILDER_SYSTEM_PROMPT },
        { role: 'user', content: `Create: ${description}` },
      ],
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

registerCapability({
  id: 'builder',
  name: '应用生成',
  description: '根据描述生成网页或应用，支持实时预览和一键部署',
  type: 'builtin',

  intent: {
    patterns: [
      /^(帮我|给我)?做[一个]?(网页|网站|应用|app|小程序)/i,
      /^生成[一个]?(网页|应用|app|网站)/i,
      /^建[一个]?(网页|网站|应用)/i,
      /^创建[一个]?(网页|网站|应用)/i,
      /^create[\s\w]*(website|app|webpage|application)/i,
      /^build[\s\w]*(app|site|web)/i,
      /^make[\s\w]*(website|app)/i,
    ],
    aiDescription: '用户想要创建一个网页或应用，需要生成代码并可以预览',
    examples: [
      '帮我做个记账网页',
      '生成一个番茄钟应用，25分钟工作5分钟休息',
      '建一个个人博客网站',
      'create a todo list app',
    ],
  },

  parameters: [
    {
      name: 'description',
      type: 'string',
      required: true,
      description: '应用功能描述、界面要求、颜色主题、交互逻辑等',
    },
    {
      name: 'type',
      type: 'enum',
      required: false,
      description: '应用类型',
      enum: ['工具', '展示', '游戏', '表单', '计算器', '其他'],
    },
  ],

  render: {
    type: 'iframe',  // 内嵌预览
    options: {
      allowDeploy: true,
      allowEdit: true,
      showCode: true,
      height: '400px',
    },
  },

  execute: async (params: any, context: ExecutionContext): Promise<ExecutionResult> => {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return {
        success: false,
        data: null,
        error: '应用生成功能未配置',
      };
    }

    try {
      // 1. 生成代码
      const code = await generateCode(params.description, openRouterKey);

      // 2. 构建预览数据（使用 Sandpack 或部署）
      // 这里返回 code，前端用 Sandpack 实时预览
      const previewData = {
        code,
        previewUrl: null,  // 如果是部署，这里填 URL
        description: params.description,
      };

      return {
        success: true,
        data: previewData,
        metadata: {
          title: '应用生成完成',
          description: params.description,
          actions: [
            {
              id: 'deploy',
              label: '部署上线',
              type: 'deploy',
              payload: { code },
            },
            {
              id: 'edit',
              label: '修改',
              type: 'modify',
              payload: { description: params.description },
            },
            {
              id: 'copy-code',
              label: '复制代码',
              type: 'custom',
              payload: { code },
            },
          ],
        },
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || '应用生成失败',
      };
    }
  },

  permissions: {
    requireAuth: true,
    plan: ['free', 'pro'],
    userConfigurable: false,
    defaultEnabled: true,
  },
});

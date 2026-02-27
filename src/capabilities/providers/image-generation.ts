// 图片生成能力 - 新架构
// 用户说"画..."→自动识别→生成图片→聊天内显示

import { registerCapability } from '../registry';
import { generateImage } from '@/lib/image/generate';
import { ExecutionContext, ExecutionResult } from '../types';

registerCapability({
  id: 'image-generation',
  name: '图片生成',
  description: '根据描述生成图片，支持多种风格和场景',
  type: 'builtin',

  intent: {
    patterns: [
      /^画[一只个张幅]?(.+)$/i,
      /^画[一个]?(.+)$/i,
      /^生成[一张]?(.+)[图片图像]?$/i,
      /^生成[图片图像][：:]?(.+)$/i,
      /^给我画[一个]?(.+)$/i,
      /^create[\s\w]*image[\sof]*(.+)$/i,
      /^draw[\s\w]*(.+)$/i,
      /^generate[\s\w]*image[\sof]*(.+)$/i,
      /^imagine[\s\w]*(.+)$/i,
    ],
    aiDescription: '用户想要生成一张图片，描述可能包含场景、物体、风格、颜色等',
    examples: [
      '画一只猫在月球上',
      '生成一张风景图，有山和湖',
      '给我画个赛博朋克风格的logo',
      'create an image of a sunset beach',
    ],
  },

  parameters: [
    {
      name: 'prompt',
      type: 'string',
      required: true,
      description: '图片描述，包含内容、风格、场景、颜色等细节',
    },
    {
      name: 'style',
      type: 'enum',
      required: false,
      description: '图片风格',
      enum: ['写实', '卡通', '油画', '水彩', '像素', '赛博朋克', '默认'],
    },
  ],

  render: {
    type: 'image',
    options: {
      allowDownload: true,
      allowRegenerate: true,
    },
  },

  execute: async (params: any, context: ExecutionContext): Promise<ExecutionResult> => {
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return {
        success: false,
        data: null,
        error: '图片生成功能未配置',
      };
    }

    try {
      // 构建完整提示词（加上风格）
      let fullPrompt = params.prompt;
      if (params.style && params.style !== '默认') {
        fullPrompt = `${fullPrompt}，${params.style}风格`;
      }

      const { imageData, mimeType } = await generateImage(fullPrompt, openRouterKey);

      return {
        success: true,
        data: `data:${mimeType};base64,${imageData}`,
        metadata: {
          title: '图片生成完成',
          description: fullPrompt,
          actions: [
            {
              id: 'regenerate',
              label: '再画一张',
              type: 'retry',
            },
            {
              id: 'modify',
              label: '修改描述',
              type: 'modify',
              payload: { prompt: params.prompt },
            },
          ],
        },
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message || '图片生成失败',
      };
    }
  },

  permissions: {
    requireAuth: true,
    plan: ['free', 'pro'],
    userConfigurable: false,  // 默认启用，不可禁用
    defaultEnabled: true,
  },
});

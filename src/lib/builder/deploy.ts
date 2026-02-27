// Builder 模式：生成代码并通过 Vercel API 部署

const VERCEL_API_URL = 'https://api.vercel.com/v13/deployments'

interface DeployResult {
  url: string
  state: string
  id: string
}

// 从生成的代码中提取并部署
export async function deployApp(
  code: string,
  projectName: string,
  vercelToken: string
): Promise<DeployResult> {
  // 创建完整的 Next.js 应用文件结构
  const files = {
    'package.json': JSON.stringify({
      name: projectName,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start'
      },
      dependencies: {
        next: '^15.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        lucide-react: '^0.460.0'
      },
      devDependencies: {
        typescript: '^5',
        '@types/node': '^20',
        '@types/react': '^19',
        '@types/react-dom': '^19',
        tailwindcss: '^3',
        postcss: '^8',
        autoprefixer: '^10'
      }
    }),
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: false,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./*'] }
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
      exclude: ['node_modules']
    }),
    'next.config.ts': `import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: 'export', distDir: 'dist' };
export default nextConfig;`,
    'tailwind.config.ts': `import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;`,
    'postcss.config.mjs': `/** @type {import('postcss-load-config').Config} */
const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };
export default config;`,
    'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
    'app/layout.tsx': `export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="antialiased">{children}</body>
    </html>
  );
}`,
    'app/page.tsx': code
  }

  // 构建 Vercel 部署请求
  const deployment = {
    name: projectName,
    target: 'production',
    files: Object.entries(files).map(([file, data]) => ({
      file,
      data,
      encoding: 'utf-8'
    })),
    framework: 'nextjs'
  }

  const res = await fetch(VERCEL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${vercelToken}`
    },
    body: JSON.stringify(deployment)
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Deploy failed: ${error}`)
  }

  const result = await res.json()
  return {
    url: `https://${result.url}`,
    state: result.state,
    id: result.id
  }
}

// 检查部署状态
export async function checkDeployStatus(deployId: string, vercelToken: string): Promise<{ ready: boolean; url?: string }> {
  const res = await fetch(`${VERCEL_API_URL}/${deployId}`, {
    headers: { Authorization: `Bearer ${vercelToken}` }
  })
  
  if (!res.ok) return { ready: false }
  
  const data = await res.json()
  return {
    ready: data.readyState === 'READY',
    url: data.url ? `https://${data.url}` : undefined
  }
}

/**
 * 根布局组件 —— 博客的 HTML 骨架
 *
 * 所有页面都包裹在此布局中：
 *   <html> → <head>（主题防闪烁脚本） → <body>
 *     → <Header /> → <main>{children}</main> → <Footer />
 *
 * 全局 SEO 元数据在此配置（标题、描述、OpenGraph），
 * 子页面可通过 generateMetadata 覆盖。
 */
import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import './globals.css'

/**
 * 全局 SEO 元数据配置
 * 这里的配置会作为默认值应用到所有页面
 */
export const metadata: Metadata = {
  // 标题模板：子页面设置 "关于" 时，最终显示为 "关于 | 莫赶"
  title: {
    default: "莫赶",
    template: "%s | 莫赶",
  },
  description: "为食而生，莫赶时间",
  // 社交媒体分享时的 OpenGraph 配置
  openGraph: {
    title: "莫赶",
    description: "为食而生，莫赶时间",
    url: 'https://veryjack.com',
    siteName: "莫赶",
    locale: 'zh_CN',
    type: 'website',
  },
}

/**
 * 根布局组件 (Root Layout)
 * 所有页面组件（children）都会被包裹在这个组件内部
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* RSS 自动发现：让 RSS 阅读器可以找到订阅地址 */}
        <link rel="alternate" type="application/rss+xml" title="莫赶 RSS" href="/rss.xml" />
        {/*
          关键脚本：防闪烁主题检测
          在 React 加载之前运行，从本地存储读取用户的主题偏好（深色/浅色）
          并立即应用 data-theme 属性，防止页面加载时出现颜色瞬间跳变。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        {/* 顶部导航栏 */}
        <Header />

        {/* 主内容区域：控制页面背景色和最大宽度 */}
        <main className="min-h-screen py-5 md:py-[30px]" style={{ backgroundColor: 'var(--color-bg-page)' }}>
          <div className="max-w-[1100px] mx-auto px-4 md:px-8">
            {/* 这里的 children 代表具体的页面内容，如首页或文章页 */}
            {children}
          </div>
        </main>

        {/* 底部版权信息栏 */}
        <Footer />
      </body>
    </html>
  )
}

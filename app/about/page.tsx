import Image from 'next/image'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAboutContent } from '@/lib/about'
import { createPageMetadata } from '@/lib/metadata'
import Icon from '@/components/Icon'

export const metadata = createPageMetadata({ title: '关于', description: '关于轨道之外和 Can Chou。', path: '/about' })

// 关于页正文来自内容源，改完要立刻可见，不能被 EdgeOne 的静态缓存挡住（原因详见 app/say/page.tsx）。
export const dynamic = 'force-dynamic'

export default function AboutPage() {
  return (
    <div className="page-shell narrow animate-fade-up">
      <header className="page-header">
        <div className="page-header-meta editorial-meta">COLOPHON / 关于</div>
        <h1 className="page-title">关于</h1>
        <p className="page-lead">轨道之外时间，慢慢记录，用心感受。</p>
      </header>
      <section className="about-profile">
        <div className="about-avatar-wrap">
          <Image src="https://img.guanyan.me/2026/05/fa7d85a90137299c295a3cdbe9790395.png" alt="Can Chou" width={84} height={84} priority />
        </div>
        <div className="about-author-info">
          <h2>Can Chou</h2>
          <p className="about-handle">@wesyzx</p>
          <div className="social-links">
            <Link href="mailto:wesyzx@gmail.com" aria-label="发送邮件"><Icon name="mail" /></Link>
            <Link href="https://github.com/wesyzx" target="_blank" aria-label="GitHub"><Icon name="github" /></Link>
            <Link href="https://x.com/wesyzx" target="_blank" aria-label="X"><Icon name="x" /></Link>
            <Link href="/rss.xml" aria-label="RSS"><Icon name="rss" /></Link>
          </div>
        </div>
      </section>
      <div className="content-divider" />
      <div className="prose"><MDXRemote source={getAboutContent()} /></div>
    </div>
  )
}

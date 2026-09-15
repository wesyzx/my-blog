import Image from 'next/image'
import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAboutContent } from '@/lib/about'
import Icon from '@/components/Icon'

export const metadata = { title: '关于', description: '关于轨道之外和 Can Chou。' }

export default function AboutPage() {
  return <div className="page-shell narrow animate-fade-up">
    <header className="page-header"><div className="page-header-row"><span className="page-icon"><Icon name="about" /></span><h1 className="page-title">关于</h1></div><p className="page-lead">轨道之外时间，慢慢记录，用心感受。</p></header>
    <section className="about-profile">
      <Image src="/home-memory.png" alt="Can Chou" width={92} height={92} priority />
      <div><h2>Can Chou</h2><p>@wesyzx</p><div className="social-links">
        <Link href="mailto:wesyzx@gmail.com" aria-label="发送邮件"><Icon name="mail" /></Link>
        <Link href="https://github.com/wesyzx" target="_blank" aria-label="GitHub"><Icon name="github" /></Link>
        <Link href="https://x.com/wesyzx" target="_blank" aria-label="X"><Icon name="x" /></Link>
        <Link href="/rss.xml" aria-label="RSS"><Icon name="rss" /></Link>
      </div></div>
    </section>
    <div className="content-divider" />
    <div className="prose"><MDXRemote source={getAboutContent()} /></div>
  </div>
}

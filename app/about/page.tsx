/**
 * 关于页面
 *
 * 已应用极简单列布局标准。
 */
import { getAboutContent } from '@/lib/about'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Image from 'next/image'

export default function AboutPage() {
  const content = getAboutContent()

  return (
    <div className="max-w-[720px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      {/* 页面头部 */}
      <header className="mb-16">
        <h1
          className="text-[32px] md:text-[40px] font-bold mb-4"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          关于
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)]">
          莫赶时间，慢慢记录，用心感受。
        </p>
      </header>

      {/* 博主头像 */}
      <div className="flex justify-center mb-16">
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden border border-[var(--color-border)] shadow-sm">
          <Image
            src="https://images.guanyan.me/%E7%BD%90%E5%A4%B4%E5%91%A8.png"
            alt="Can Chou"
            width={120}
            height={120}
            className="object-cover"
          />
        </div>
      </div>

      {/* MDX 渲染的个人介绍正文 */}
      <div
        className="prose max-w-none
          prose-p:text-[16px] prose-p:leading-[1.85] prose-p:text-[var(--color-text-secondary)]
          prose-strong:text-[var(--color-text-primary)]
          prose-a:text-[var(--color-accent)] prose-a:no-underline prose-a:border-b prose-a:border-dotted
          prose-hr:border-[var(--color-border)]
          prose-li:text-[15px] prose-li:leading-[1.8]
          prose-em:text-[var(--color-text-muted)]
        "
      >
        <MDXRemote source={content} />
      </div>
    </div>
  )
}

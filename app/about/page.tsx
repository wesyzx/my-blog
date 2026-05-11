import { getAboutContent } from '@/lib/about'
import { MDXRemote } from 'next-mdx-remote/rsc'

export default function AboutPage() {
  const content = getAboutContent()

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="card p-[30px] md:p-[45px]">
        <h1
          className="text-[30px] font-bold mb-8 text-center"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          关于
        </h1>

        {/* 头像 */}
        <div className="flex justify-center mb-10">
          <div className="w-[150px] h-[150px] rounded-full overflow-hidden border-2 flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
            <Image
              src="https://img.guanyan.me/2026/05/fa7d85a90137299c295a3cdbe9790395.png"
              alt="Can Chou"
              width={150}
              height={150}
              className="object-cover"
            />
          </div>
        </div>

        <div
          className="prose max-w-none
            prose-p:text-[16px] prose-p:leading-[1.8]
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
    </div>
  )
}

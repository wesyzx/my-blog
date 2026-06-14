/**
 * 文章详情页
 *
 * 仅展示博文本身：封面图、标题、日期、正文、评论区。
 * 已应用极简单列布局标准。
 */
import { getPostBySlug, getAllPosts } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ArtalkComments from '@/components/ArtalkComments'

/** 格式化日期为中文形式：2026年5月11日 */
function formatDate(dateStr: string) {
  if (!dateStr) return '未知日期'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '未知日期'
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 构建时预生成所有文章页面（SSG） */
export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

/** 动态 SEO 元数据 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.cover ? [post.cover] : [],
    },
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) notFound()

  return (
    <div className="max-w-[720px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      <article>
        {/* 文章头部 */}
        <header className="mb-16">
          <div className="mb-4">
            <Link
              href={`/?category=${post.category}`}
              className="text-[13px] font-medium tracking-wider text-[var(--color-accent)] hover:underline opacity-80"
            >
              {post.category}
            </Link>
          </div>
          <h1
            className="text-[32px] md:text-[40px] font-bold mb-6 leading-[1.3]"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            {post.title}
          </h1>
          <time
            className="text-[14px] text-[var(--color-text-muted)]"
          >
            {formatDate(post.date)}
          </time>
        </header>

        {/* 封面图 */}
        {post.cover && (
          <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden mb-16 shadow-sm border border-[var(--color-border)]">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* 文章正文 */}
        <div
          className="prose max-w-none
            prose-headings:font-bold prose-headings:text-[var(--color-text-primary)]
            prose-p:text-[16px] prose-p:leading-[1.85] prose-p:text-[var(--color-text-secondary)]
            prose-a:text-[var(--color-accent)] prose-a:no-underline prose-a:border-b prose-a:border-dotted
            prose-img:rounded-xl prose-img:mx-auto
            prose-blockquote:border-l-[3px] prose-blockquote:border-[var(--color-accent)] prose-blockquote:bg-[var(--color-bg-surface)] prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:rounded-r-lg
            prose-li:text-[16px] prose-li:leading-[1.8]
          "
        >
          <MDXRemote source={post.content} />
        </div>
      </article>

      {/* 评论区 */}
      <div className="mt-20 pt-10 border-t border-[var(--color-border)]">
        <h2 className="text-[20px] font-bold mb-8" style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}>
          评论
        </h2>
        <ArtalkComments pageKey={`/posts/${post.slug}`} pageTitle={post.title} />
      </div>

      {/* 返回首页 */}
      <div className="mt-16 text-center">
        <Link
          href="/"
          className="text-[14px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          &larr; 返回首页
        </Link>
      </div>
    </div>
  )
}

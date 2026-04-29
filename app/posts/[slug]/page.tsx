import { getPostBySlug, getAllPosts } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Comments from '@/components/Comments'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

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

  const tags = post.tags.length > 0 ? post.tags : [post.category]

  // 相关文章（同分类，排除当前文章）
  const allPosts = getAllPosts()
  const relatedPosts = allPosts
    .filter((p) => p.category === post.category && p.slug !== slug)
    .slice(0, 3)

  return (
    <article className="max-w-[750px] mx-auto">
      <div className="card p-[30px] md:p-[45px]">
        {/* 封面图 */}
        {post.cover && (
          <div className="relative w-full aspect-[2/1] rounded-[5px] overflow-hidden mb-[35px]">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* 文章头部 */}
        <header className="mb-[35px] text-center">
          {/* 分类 */}
          <span className="tag inline-flex mb-[15px]">{post.category}</span>

          {/* 标题 — 衬线字体，大字 */}
          <h1
            className="text-[28px] md:text-[34px] font-bold mb-[15px] leading-[1.35]"
            style={{
              color: 'var(--color-heading)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            {post.title}
          </h1>

          {/* 元信息 */}
          <div
            className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium"
            style={{ color: 'var(--color-muted)' }}
          >
            <time>{formatDate(post.date)}</time>
            <span style={{ color: 'var(--color-border-strong)' }}>/</span>
            <span>{tags.slice(0, 3).join(', ')}</span>
            <span style={{ color: 'var(--color-border-strong)' }}>/</span>
            <Link href="#comments" style={{ color: 'inherit' }} className="hover:text-[var(--color-primary)] transition-colors">
              评论
            </Link>
          </div>
        </header>

        <hr className="divider" />

        {/* 文章正文 — 优化阅读体验 */}
        <div
          className="prose max-w-none
            prose-headings:font-bold
            prose-headings:tracking-[0.01em]
            prose-p:text-[16px] prose-p:leading-[1.85] prose-p:tracking-[0.005em]
            prose-a:no-underline prose-a:border-b prose-a:border-dotted prose-a:pb-[1px]
            prose-a:transition-colors
            prose-a:hover:border-solid
            prose-img:rounded-[5px] prose-img:mx-auto
            prose-code:px-[5px] prose-code:py-[1px] prose-code:rounded-[3px] prose-code:text-[14px] prose-code:before:content-none prose-code:after:content-none
            prose-pre:rounded-[5px] prose-pre:shadow-sm
            prose-blockquote:border-l-[3px] prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:not-italic prose-blockquote:text-[15px]
            prose-li:text-[16px] prose-li:leading-[1.75]
          "
        >
          <MDXRemote source={post.content} />
        </div>

        {/* 标签 */}
        <div className="mt-8 flex items-center flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>

      {/* 支持按钮 */}
      <div className="text-center mt-8">
        <a href="/support_me" className="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          支持作者
        </a>
      </div>

      {/* 相关文章 */}
      {relatedPosts.length > 0 && (
        <div className="card p-[30px] md:p-[40px] mt-8">
          <h3
            className="text-[18px] font-bold mb-5"
            style={{
              color: 'var(--color-heading)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            相关文章
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.slug}
                href={'/posts/' + rp.slug}
                className="block group"
              >
                {rp.cover && (
                  <div
                    className="w-full aspect-[16/9] rounded-[4px] overflow-hidden mb-2"
                    style={{ backgroundColor: 'var(--color-tag-bg)' }}
                  >
                    <Image
                      src={rp.cover}
                      alt={rp.title}
                      width={400}
                      height={225}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                    />
                  </div>
                )}
                <h4
                  className="text-[14px] font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-[var(--color-primary)]"
                  style={{ color: 'var(--color-heading)' }}
                >
                  {rp.title}
                </h4>
                <span className="text-[12px] mt-1 block" style={{ color: 'var(--color-light)' }}>
                  {formatDate(rp.date)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 评论 */}
      <div className="card p-[30px] md:p-[40px] mt-8">
        <Comments postDate={post.date} />
      </div>

      {/* 返回首页 */}
      <div className="text-center mt-8">
        <Link
          href="/"
          className="text-[14px] font-medium transition-colors inline-flex items-center gap-1"
          style={{ color: 'var(--color-muted)' }}
        >
          &larr; 返回首页
        </Link>
      </div>
    </article>
  )
}

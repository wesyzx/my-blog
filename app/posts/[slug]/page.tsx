import { getPostBySlug, getAllPosts } from '@/lib/posts'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ArtalkComments from '@/components/ArtalkComments'

// 辅助函数：格式化日期显示
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * 静态参数生成函数
 * 告诉 Next.js 在构建时预先生成哪些文章页面，从而极大提高访问速度
 */
export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

/**
 * 动态 SEO 元数据生成
 * 根据文章内容自动设置网页标签页标题、描述和社交媒体分享图
 */
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

/**
 * 文章详情页组件
 */
export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  // 1. 获取 URL 中的 slug 并查询文章数据
  const { slug } = await params
  const post = getPostBySlug(slug)
  
  // 如果文章不存在，直接显示 404 页面
  if (!post) notFound()

  const tags = post.tags.length > 0 ? post.tags : [post.category]

  // 2. 相关文章逻辑：获取同分类下的其他 3 篇文章进行推荐
  const allPosts = getAllPosts()
  const relatedPosts = allPosts
    .filter((p) => p.category === post.category && p.slug !== slug)
    .slice(0, 3)

  return (
    <article className="max-w-[750px] mx-auto">
      <div className="card p-[30px] md:p-[45px]">
        {/* 封面图展示 */}
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

        {/* 文章头部信息 */}
        <header className="mb-[35px] text-center">
          {/* 分类标签 */}
          <span className="tag-category inline-flex mb-[15px]">{post.category}</span>

          {/* 文章标题 — 衬线字体，大字 */}
          <h1
            className="text-[28px] md:text-[34px] font-bold mb-[15px] leading-[1.35]"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            {post.title}
          </h1>

          {/* 发布时间、标签等元信息 */}
          <div
            className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <time>{formatDate(post.date)}</time>
            <span style={{ color: 'var(--color-border-hover)' }}>/</span>
            <span>{tags.slice(0, 3).join(', ')}</span>
            <span style={{ color: 'var(--color-border-hover)' }}>/</span>
            <Link href="#comments" style={{ color: 'inherit' }} className="hover:text-[var(--color-accent)] transition-colors">
              评论
            </Link>
          </div>
        </header>

        <hr className="divider" />

        {/* 
          文章正文渲染区域 — 优化阅读体验
          prose 类名来自 Tailwind Typography 插件，负责美化 Markdown 转换后的 HTML 样式
        */}
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
          {/* 使用 MDXRemote 将 Markdown 字符串渲染为 React 组件 */}
          <MDXRemote source={post.content} />
        </div>

        {/* 底部标签列表 */}
        <div className="mt-8 flex items-center flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="tag-category">{tag}</span>
          ))}
        </div>
      </div>

      {/* 渲染相关文章推荐块 */}
      {relatedPosts.length > 0 && (
        <div className="card p-[30px] md:p-[40px] mt-8">
          <h3
            className="text-[18px] font-bold mb-5"
            style={{
              color: 'var(--color-text-primary)',
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
                    style={{ backgroundColor: 'var(--color-bg-surface)' }}
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
                  className="text-[14px] font-semibold leading-snug line-clamp-2 transition-colors group-hover:text-[var(--color-accent)]"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {rp.title}
                </h4>
                <span className="text-[12px] mt-1 block" style={{ color: 'var(--color-text-hint)' }}>
                  {formatDate(rp.date)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 评论模块 */}
      <div className="card p-[30px] md:p-[40px] mt-8">
        <ArtalkComments pageKey={`/posts/${post.slug}`} pageTitle={post.title} />
      </div>

      {/* 底部导航 */}
      <div className="text-center mt-8">
        <Link
          href="/"
          className="text-[14px] font-medium transition-colors inline-flex items-center gap-1"
          style={{ color: 'var(--color-text-muted)' }}
        >
          &larr; 返回首页
        </Link>
      </div>
    </article>
  )
}

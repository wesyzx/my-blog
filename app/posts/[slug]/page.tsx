import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug } from '@/lib/posts'
import { formatItemDate } from '@/lib/format'
import { createPageMetadata } from '@/lib/metadata'
import ArtalkComments from '@/components/ArtalkComments'
import BlogImage from '@/components/BlogImage'
import ImageLightbox from '@/components/ImageLightbox'
import MarkdownImage from '@/components/MarkdownImage'
import Icon from '@/components/Icon'

export function generateStaticParams() { return getAllPosts().map((post) => ({ slug: post.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPostBySlug((await params).slug)
  if (!post) return {}
  return createPageMetadata({
    title: post.title,
    description: post.excerpt || post.title,
    path: `/posts/${encodeURIComponent(post.slug)}`,
    images: post.cover ? [post.cover] : [],
  })
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const allPosts = getAllPosts()
  const currentIndex = allPosts.findIndex((p) => p.slug === post.slug)
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null
  const nextPost = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null

  const categoryHref = `/posts?category=${encodeURIComponent(post.category)}`

  return (
    /* 内页移除作者侧栏，正文保留居中的阅读宽度。 */
    <div className="page-shell narrow article-shell animate-fade-up">
      <article className="article-detail">
        <header className="article-header">
          <div className="entry-meta">
            <time dateTime={post.date}>{formatItemDate(post.date)}</time>
            <span aria-hidden="true">/</span>
            <Link href={categoryHref}>{post.category}</Link>
          </div>

          <h1 className="article-title">{post.title}</h1>

          {post.excerpt && <p className="article-lead">{post.excerpt}</p>}

          {post.tags.length > 0 && (
            <div className="article-tags" aria-label="文章标签">
              {post.tags.map((tag) => (
                <span key={tag} className="article-tag">#{tag}</span>
              ))}
            </div>
          )}
        </header>

        {post.cover && (
          <figure className="article-cover">
            <BlogImage
              preset="banner"
              src={post.cover}
              alt=""
              fill
              fetchPriority="high"
              sizes="(max-width: 860px) calc(100vw - 40px), (max-width: 976px) calc(100vw - 48px), 880px"
            />
          </figure>
        )}

        {/* 保留服务端 MDX 正文，客户端只增强图片交互。 */}
        <ImageLightbox className="prose">
          <MDXRemote source={post.content} components={{ img: MarkdownImage }} />
        </ImageLightbox>
      </article>

      <nav className="post-nav" aria-label="上一篇与下一篇">
        {prevPost ? (
          <Link href={`/posts/${encodeURIComponent(prevPost.slug)}`} className="post-nav-item prev">
            <span className="post-nav-label">← 上一篇</span>
            <span className="post-nav-title">{prevPost.title}</span>
          </Link>
        ) : (
          <div className="post-nav-item empty" />
        )}

        {nextPost ? (
          <Link href={`/posts/${encodeURIComponent(nextPost.slug)}`} className="post-nav-item next">
            <span className="post-nav-label">下一篇 →</span>
            <span className="post-nav-title">{nextPost.title}</span>
          </Link>
        ) : (
          <div className="post-nav-item empty" />
        )}
      </nav>

      <section className="comments-section">
        <h2 className="section-title">评论</h2>
        <ArtalkComments pageKey={`/posts/${post.slug}`} pageTitle={post.title} />
      </section>

      <div className="article-footer-nav">
        <Link href="/posts" className="back-link">
          <Icon name="arrow-left" />
          <span>返回文章目录</span>
        </Link>
      </div>
    </div>
  )
}

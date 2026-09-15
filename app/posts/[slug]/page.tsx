import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug } from '@/lib/posts'
import ArtalkComments from '@/components/ArtalkComments'
import Icon from '@/components/Icon'

function formatEditorialDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '日期待定'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export function generateStaticParams() { return getAllPosts().map((post) => ({ slug: post.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPostBySlug((await params).slug)
  if (!post) return {}
  return { title: post.title, description: post.excerpt || post.title, alternates: { canonical: `/posts/${encodeURIComponent(post.slug)}` }, openGraph: { title: post.title, description: post.excerpt || post.title, images: post.cover ? [post.cover] : [] } }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const allPosts = getAllPosts()
  const currentIndex = allPosts.findIndex((p) => p.slug === post.slug)
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null
  const nextPost = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null

  return (
    <div className="page-shell narrow animate-fade-up">
      <article className="article-detail">
        <header className="article-header">
          <div className="article-meta-top">
            <Link
              href={`/?category=${encodeURIComponent(post.category)}`}
              className="article-category editorial-meta"
            >
              {post.category}
            </Link>
            <span className="editorial-meta-sep" aria-hidden="true">/</span>
            <time className="article-date editorial-meta" dateTime={post.date}>
              {formatEditorialDate(post.date)}
            </time>
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
          <div className="article-cover">
            <Image
              src={post.cover}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 760px) 100vw, 720px"
            />
          </div>
        )}

        <div className="prose">
          <MDXRemote source={post.content} />
        </div>
      </article>

      {/* Previous / Next Editorial Nav */}
      <nav className="post-nav" aria-label="上一篇与下一篇">
        {prevPost ? (
          <Link href={`/posts/${encodeURIComponent(prevPost.slug)}`} className="post-nav-item prev">
            <span className="post-nav-label editorial-meta">← PREVIOUS</span>
            <span className="post-nav-title">{prevPost.title}</span>
          </Link>
        ) : (
          <div className="post-nav-item empty" />
        )}

        {nextPost ? (
          <Link href={`/posts/${encodeURIComponent(nextPost.slug)}`} className="post-nav-item next">
            <span className="post-nav-label editorial-meta">NEXT →</span>
            <span className="post-nav-title">{nextPost.title}</span>
          </Link>
        ) : (
          <div className="post-nav-item empty" />
        )}
      </nav>

      <section className="comments-section">
        <h2 className="section-title">
          <Icon name="comment" />
          <span>评论</span>
        </h2>
        <ArtalkComments pageKey={`/posts/${post.slug}`} pageTitle={post.title} />
      </section>

      <div className="article-footer-nav">
        <Link href="/" className="back-link">
          <Icon name="arrow-left" />
          <span>返回文章目录</span>
        </Link>
      </div>
    </div>
  )
}

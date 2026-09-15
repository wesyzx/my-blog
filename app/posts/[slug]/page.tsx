import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug } from '@/lib/posts'
import ArtalkComments from '@/components/ArtalkComments'
import Icon from '@/components/Icon'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '日期待定' : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(date)
}

export function generateStaticParams() { return getAllPosts().map((post) => ({ slug: post.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPostBySlug((await params).slug)
  if (!post) return {}
  return { title: post.title, description: post.excerpt || post.title, alternates: { canonical: `/posts/${encodeURIComponent(post.slug)}` }, openGraph: { title: post.title, description: post.excerpt || post.title, images: post.cover ? [post.cover] : [] } }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPostBySlug((await params).slug)
  if (!post) notFound()
  return <div className="page-shell narrow animate-fade-up">
    <article className="article-detail">
      <header className="article-header"><Link href={`/?category=${encodeURIComponent(post.category)}`}>{post.category}</Link><h1>{post.title}</h1>{post.excerpt && <p>{post.excerpt}</p>}<div><Icon name="calendar" /><time>{formatDate(post.date)}</time>{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></header>
      {post.cover && <div className="article-cover"><Image src={post.cover} alt={post.title} fill priority sizes="(max-width: 760px) 100vw, 760px" /></div>}
      <div className="prose"><MDXRemote source={post.content} /></div>
    </article>
    <section className="comments-section"><h2 className="section-title"><Icon name="comment" />评论</h2><ArtalkComments pageKey={`/posts/${post.slug}`} pageTitle={post.title} /></section>
    <Link href="/" className="back-link"><Icon name="arrow-left" />返回首页</Link>
  </div>
}

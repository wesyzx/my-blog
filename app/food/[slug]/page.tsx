import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllFoodPosts, getFoodPostBySlug } from '@/lib/food'
import ArtalkComments from '@/components/ArtalkComments'
import Icon from '@/components/Icon'

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '日期待定' : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(date)
}

export async function generateStaticParams() { return (await getAllFoodPosts()).map((post) => ({ slug: post.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getFoodPostBySlug((await params).slug)
  return post ? { title: `${post.title} - 美食地图`, description: post.excerpt || post.address, alternates: { canonical: `/food/${encodeURIComponent(post.slug)}` } } : {}
}

export default async function FoodPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getFoodPostBySlug((await params).slug)
  if (!post) notFound()
  return <div className="page-shell narrow animate-fade-up">
    <article className="article-detail food-detail">
      <header className="article-header"><span className="article-category">美食记录</span><h1>{post.title}</h1>{post.excerpt && <p>{post.excerpt}</p>}<div><Icon name="location" /><span>{post.address || post.location}</span><Icon name="calendar" /><time>{formatDate(post.date)}</time></div></header>
      {post.cover && <div className="article-cover"><Image src={post.cover} alt={post.title} fill priority sizes="(max-width: 760px) 100vw, 760px" /></div>}
      {post.content && <div className="prose"><MDXRemote source={post.content} /></div>}
      {post.images.length > 1 && <section className="detail-gallery"><h2 className="section-title"><Icon name="image" />更多图片</h2><div>{post.images.slice(1).map((src, index) => <Image key={src} src={src} alt={`${post.title} 图片 ${index + 2}`} width={360} height={270} />)}</div></section>}
    </article>
    <section className="comments-section"><h2 className="section-title"><Icon name="comment" />评论</h2><ArtalkComments pageKey={`/food/${post.slug}`} pageTitle={post.title} /></section>
    <Link href="/food" className="back-link"><Icon name="arrow-left" />返回美食地图</Link>
  </div>
}

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllFoodPosts, getFoodPostBySlug } from '@/lib/food'
import { createPageMetadata } from '@/lib/metadata'
import ArtalkComments from '@/components/ArtalkComments'
import ImageLightbox from '@/components/ImageLightbox'
import Icon from '@/components/Icon'
import { formatItemDate } from '@/lib/format'

export async function generateStaticParams() { return (await getAllFoodPosts()).map((post) => ({ slug: post.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getFoodPostBySlug((await params).slug)
  return post ? createPageMetadata({
    title: `${post.title} - 美食地图`,
    description: post.excerpt || post.address,
    path: `/food/${encodeURIComponent(post.slug)}`,
    images: post.cover ? [post.cover] : [],
  }) : {}
}

export default async function FoodPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getFoodPostBySlug((await params).slug)
  if (!post) notFound()
  return (
    <div className="page-shell narrow animate-fade-up">
      <article className="article-detail food-detail">
        <header className="article-header">
          <div className="article-meta-top">
            <Link href="/food" className="article-category">美食地图</Link>
            <span className="editorial-meta-sep" aria-hidden="true">/</span>
            <time className="article-date" dateTime={post.date}>
              {formatItemDate(post.date)}
            </time>
          </div>

          <h1 className="article-title">{post.title}</h1>

          {post.excerpt && <p className="article-lead">{post.excerpt}</p>}

          <div className="food-meta-location">
            <Icon name="location" />
            <span>{post.address || post.location}</span>
          </div>
        </header>

        {post.cover && (
          <div className="article-cover">
            <Image src={post.cover} alt={post.title} fill fetchPriority="high" sizes="(max-width: 760px) 100vw, 720px" />
          </div>
        )}

        {post.content && (
          <div className="prose">
            <MDXRemote source={post.content} />
          </div>
        )}

        {post.images.length > 1 && (
          <section className="detail-gallery">
            <h2 className="section-title">更多图片</h2>
            <ImageLightbox>
              {post.images.slice(1).map((src, index) => (
                <a href={src} target="_blank" rel="noopener noreferrer" key={src}>
                  <Image src={src} alt={`${post.title} 图片 ${index + 2}`} width={360} height={270} data-lightbox-src={src} />
                </a>
              ))}
            </ImageLightbox>
          </section>
        )}
      </article>

      <section className="comments-section">
        <h2 className="section-title">评论</h2>
        <ArtalkComments pageKey={`/food/${post.slug}`} pageTitle={post.title} />
      </section>

      <div className="article-footer-nav">
        <Link href="/food" className="back-link">
          <Icon name="arrow-left" />
          <span>返回美食地图</span>
        </Link>
      </div>
    </div>
  )
}

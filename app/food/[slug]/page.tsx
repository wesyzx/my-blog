import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllFoodPosts, getFoodPostBySlug } from '@/lib/food'
import { blogImageUrl } from '@/lib/blog-images.mjs'
import { createPageMetadata } from '@/lib/metadata'
import ArtalkComments from '@/components/ArtalkComments'
import BlogImage from '@/components/BlogImage'
import ImageLightbox from '@/components/ImageLightbox'
import MarkdownImage from '@/components/MarkdownImage'
import Icon from '@/components/Icon'
import PageHeader from '@/components/PageHeader'

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
  const locationLabel = (post.address || post.location).trim()
  return (
    <div className="page-shell narrow animate-fade-up">
      <article className="article-detail food-detail">
        <PageHeader title={post.title} date={post.date} description={post.excerpt}>
          {locationLabel && locationLabel !== post.title.trim() && (
            <div className="food-meta-location">
              <Icon name="location" />
              <span>{locationLabel}</span>
            </div>
          )}
        </PageHeader>

        {post.cover && (
          <div className="article-cover">
            <BlogImage preset="banner" src={post.cover} alt={post.title} fill fetchPriority="high" sizes="(max-width: 860px) calc(100vw - 40px), (max-width: 976px) calc(100vw - 48px), 880px" />
          </div>
        )}

        {post.content && (
          <ImageLightbox className="prose">
            <MDXRemote source={post.content} components={{ img: MarkdownImage }} />
          </ImageLightbox>
        )}

        {post.images.length > 1 && (
          <section className="detail-gallery">
            <h2 className="section-title">更多图片</h2>
            <ImageLightbox>
              {post.images.slice(1).map((src, index) => (
                <a href={blogImageUrl(src, { preset: 'full' })} target="_blank" rel="noopener noreferrer" key={src}>
                  <BlogImage
                    preset="landscape"
                    src={src}
                    alt={`${post.title} 图片 ${index + 2}`}
                    fill
                    sizes="(max-width: 860px) 50vw, 440px"
                    data-lightbox-src={blogImageUrl(src, { preset: 'full' })}
                  />
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

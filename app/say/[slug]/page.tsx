import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSayBySlug, getSaySummary } from '@/lib/say'
import { blogImageUrl } from '@/lib/blog-images.mjs'
import { createPageMetadata } from '@/lib/metadata'
import { formatItemDate } from '@/lib/format'
import SafeMarkdown from '@/components/SafeMarkdown'
import BlogImage from '@/components/BlogImage'
import ImageLightbox from '@/components/ImageLightbox'
import ArtalkComments from '@/components/ArtalkComments'
import Icon from '@/components/Icon'
import NoteMap from '@/components/NoteMap'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const say = await getSayBySlug((await params).slug)
  if (!say) return {}

  return createPageMetadata({
    title: `短记 · ${formatItemDate(say.date)}`,
    description: getSaySummary(say.content, 120),
    path: `/say/${encodeURIComponent(say.slug)}`,
    images: say.images?.length ? [say.images[0]] : [],
  })
}

export default async function SayDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const say = await getSayBySlug((await params).slug)
  if (!say) notFound()

  const pageTitle = `短记 ${formatItemDate(say.date)}`

  return (
    <div className="page-shell narrow animate-fade-up">
      <article className="note-detail">
        <header className="note-detail-header">
          <p className="page-kicker">NOTE / 短记</p>
          <time className="item-time" dateTime={say.date}>{formatItemDate(say.date)}</time>
        </header>

        <div className="note-content">
          <SafeMarkdown source={say.content} />
        </div>

        {say.latitude !== undefined && say.longitude !== undefined && (
          <section className="note-location-block" aria-label="短记地点">
            {say.location && (
              <div className="note-location">
                <Icon name="location" />
                {say.location}
              </div>
            )}
            <NoteMap latitude={say.latitude} longitude={say.longitude} label={say.location || pageTitle} />
          </section>
        )}

        {say.images && say.images.length > 0 && (
          <ImageLightbox className={`say-images count-${Math.min(say.images.length, 3)}`}>
            {say.images.map((src, index) => (
              <a href={blogImageUrl(src, { preset: 'full' })} target="_blank" rel="noopener noreferrer" key={src}>
                <BlogImage
                  preset="square"
                  src={src}
                  alt={`短记配图 ${index + 1}`}
                  fill
                  sizes="(max-width: 760px) 100vw, 680px"
                  data-lightbox-src={blogImageUrl(src, { preset: 'full' })}
                />
              </a>
            ))}
          </ImageLightbox>
        )}
      </article>

      <section className="comments-section">
        <h2 className="section-title">评论</h2>
        <ArtalkComments pageKey={`/say/${say.slug}`} pageTitle={pageTitle} />
      </section>

      <div className="article-footer-nav">
        <Link href="/say" className="back-link">
          <Icon name="arrow-left" />
          <span>返回短记</span>
        </Link>
      </div>
    </div>
  )
}

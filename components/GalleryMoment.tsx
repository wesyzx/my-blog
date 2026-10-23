import BlogImage from '@/components/BlogImage'
import { blogImageUrl } from '@/lib/blog-images.mjs'
import Link from 'next/link'
import ImageLightbox from '@/components/ImageLightbox'
import type { GalleryMeta } from '@/lib/gallery'
import { formatItemDate } from '@/lib/format'

function previewImages(album: GalleryMeta) {
  if (album.images.length > 0) return album.images.slice(0, 7)
  return album.cover ? [{ src: album.cover, width: 1600, height: 1067 }] : []
}

/**
 * Ueno 的 Moments 不是相册“卡片”，而是一段段由日期、标题和照片墙组成的记录。
 * 这里保留相册详情页入口，同时让照片在列表页就成为内容本身。
 */
export default function GalleryMoment({ album, headingLevel = 'h2' }: { album: GalleryMeta; headingLevel?: 'h2' | 'h3' | 'h4' }) {
  const images = previewImages(album)
  const href = `/gallery/${encodeURIComponent(album.slug)}`
  const Heading = headingLevel

  return (
    <article className="moment-item">
      <span className="stream-meta">
        <time className="item-time" dateTime={album.date}>{formatItemDate(album.date)}</time>
      </span>
      <Heading className="moment-title"><Link href={href}>{album.title}</Link></Heading>
      {album.excerpt && <p className="moment-excerpt">{album.excerpt}</p>}

      {images.length > 0 && (
        <ImageLightbox
          className={`moment-grid moment-count-${images.length}`}
        >
          {images.map((image, index) => (
            <a href={blogImageUrl(image.src, { preset: 'full' })} className="moment-photo" key={`${image.src}-${index}`} aria-label={`放大照片：${album.title}，第 ${index + 1} 张`} aria-haspopup="dialog">
              <BlogImage
                preset={images.length === 1 ? 'wide' : 'landscape'}
                src={image.src}
                alt={`${album.title}，第 ${index + 1} 张`}
                fill
                sizes={images.length === 1
                  ? '(max-width: 860px) calc(100vw - 40px), 680px'
                  : '(max-width: 560px) 50vw, (max-width: 860px) 33vw, 220px'}
                unoptimized={process.env.NODE_ENV === 'development'}
                data-lightbox-src={blogImageUrl(image.src, { preset: 'full' })}
                data-pswp-width={image.width}
                data-pswp-height={image.height}
              />
            </a>
          ))}
        </ImageLightbox>
      )}
    </article>
  )
}

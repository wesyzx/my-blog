import Image from 'next/image'
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
        <span>相册</span>
      </span>
      <Heading className="moment-title"><Link href={href}>{album.title}</Link></Heading>
      {album.excerpt && <p className="moment-excerpt">{album.excerpt}</p>}

      {images.length > 0 && (
        <ImageLightbox
          className={`moment-grid moment-count-${images.length}`}
        >
          {images.map((image, index) => (
            <a href={image.src} className="moment-photo" key={`${image.src}-${index}`} aria-label={`放大照片：${album.title}，第 ${index + 1} 张`} aria-haspopup="dialog">
              <Image
                src={image.src}
                alt={`${album.title}，第 ${index + 1} 张`}
                fill
                sizes="(max-width: 560px) 50vw, (max-width: 860px) 33vw, 220px"
                unoptimized={process.env.NODE_ENV === 'development'}
                data-lightbox-src={image.src}
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

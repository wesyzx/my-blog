import Link from 'next/link'
import GalleryMosaic from './GalleryMosaic'
import type { GalleryMedia, GalleryMeta } from '@/lib/gallery'
import { formatItemDate } from '@/lib/format'

function previewMedia(album: GalleryMeta): GalleryMedia[] {
  if (album.images.length > 0) return album.images
  return album.cover ? [{ kind: 'image', src: album.cover, width: 1600, height: 1067 }] : []
}

/**
 * Ueno 的 Moments 不是相册“卡片”，而是一段段由日期、标题和照片墙组成的记录。
 * 这里保留相册详情页入口，同时让照片在列表页就成为内容本身。
 */
export default function GalleryMoment({ album, headingLevel = 'h2' }: { album: GalleryMeta; headingLevel?: 'h2' | 'h3' | 'h4' }) {
  const images = previewMedia(album)
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
        <GalleryMosaic images={images} title={album.title} />
      )}
    </article>
  )
}

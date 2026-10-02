import Image from 'next/image'
import Link from 'next/link'
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
        <Link
          href={href}
          className={`moment-grid moment-count-${images.length}`}
          aria-label={`查看相册：${album.title}，共 ${album.images.length || images.length} 张照片`}
        >
          {images.map((image, index) => (
            <span className="moment-photo" key={`${image.src}-${index}`}>
              <Image
                src={image.src}
                alt=""
                fill
                sizes="(max-width: 560px) 50vw, (max-width: 860px) 33vw, 220px"
              />
            </span>
          ))}
        </Link>
      )}
    </article>
  )
}

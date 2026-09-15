import Image from 'next/image'
import Link from 'next/link'
import type { GalleryMeta } from '@/lib/gallery'
import Icon from './Icon'

function formatEditorialDate(dateStr?: string) {
  if (!dateStr) return '日期待定'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}.${month}`
}

export default function GalleryList({ albums }: { albums: GalleryMeta[] }) {
  return (
    <div className="page-shell animate-fade-up">
      <header className="page-header">
        <div className="page-header-meta editorial-meta">PORTFOLIO / 凝固瞬间</div>
        <h1 className="page-title">相册</h1>
        <p className="page-lead">随着快门的开启，时间被凝固下来，成为此时此刻的记录。</p>
      </header>

      {albums.length === 0 ? (
        <div className="empty-state">还没有相册。</div>
      ) : (
        <div className="gallery-list">
          {albums.map((album) => (
            <Link
              href={`/gallery/${encodeURIComponent(album.slug)}`}
              key={album.slug}
              className="gallery-card"
            >
              <div className="gallery-cover">
                {album.cover ? (
                  <Image
                    src={album.cover}
                    alt={album.title}
                    fill
                    sizes="(max-width: 760px) 100vw, 33vw"
                  />
                ) : (
                  <div className="image-placeholder">
                    <Icon name="image" />
                  </div>
                )}
                <span className="cover-badge">{album.images.length} 张</span>
              </div>

              <div className="gallery-info">
                <div className="gallery-meta">
                  <span className="editorial-meta">{album.category}</span>
                  <span className="editorial-meta-sep">/</span>
                  <time className="editorial-meta">{formatEditorialDate(album.date)}</time>
                </div>
                <h2>{album.title}</h2>
                {album.excerpt && <p>{album.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

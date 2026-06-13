'use client'

/**
 * 相册列表组件
 *
 * 已应用极简单列布局标准。
 */
import { useState, useMemo } from 'react'
import PhotoAlbum from 'react-photo-album'
import Lightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'react-photo-album/styles.css'
import type { GalleryMeta } from '@/lib/gallery'

const ITEMS_PER_PAGE = 24

function buildPhotos(albums: GalleryMeta[]) {
  const ratios = [1.5, 0.67, 0.67, 1.5, 0.75, 0.67, 0.67, 1.5]
  const photos: any[] = []
  let idx = 0
  for (const album of albums) {
    for (let i = 0; i < album.images.length; i++) {
      const ratio = ratios[idx % ratios.length]
      photos.push({
        src: album.images[i],
        width: 1200,
        height: Math.round(1200 / ratio),
        key: `${album.slug}-${i}`,
        alt: `${album.title} - ${i + 1}`,
        title: album.title,
        albumTitle: album.title,
        albumSlug: album.slug,
      })
      idx++
    }
  }
  return photos
}

export default function GalleryList({ albums }: { albums: GalleryMeta[] }) {
  const [page, setPage] = useState(1)
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const allPhotos = useMemo(() => buildPhotos(albums), [albums])
  const totalPages = Math.max(1, Math.ceil(allPhotos.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pagedPhotos = allPhotos.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  )

  const lightboxSlides = useMemo(
    () => pagedPhotos.map((p) => ({ src: p.src, alt: p.alt, title: p.albumTitle })),
    [pagedPhotos]
  )

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      {/* 页面头部 */}
      <header className="mb-16">
        <h1
          className="text-[32px] md:text-[40px] font-bold mb-4"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          相册
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)]">
          随着快门的开启，时间被凝固下来，作为「此时此刻」的记录。
        </p>
      </header>

      {/* 照片瀑布流布局 */}
      {pagedPhotos.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[var(--color-border)] rounded-xl">
          <p className="text-[14px] text-[var(--color-text-hint)]">
            暂无照片
          </p>
        </div>
      ) : (
        <div className="gallery-grid">
          <PhotoAlbum
            layout="rows"
            photos={pagedPhotos}
            targetRowHeight={320}
            spacing={8}
            padding={0}
            rowConstraints={{ minPhotos: 2, maxPhotos: 4 }}
            onClick={({ index }) => setLightboxIndex(index)}
          />
        </div>
      )}

      {/* 分页控件 */}
      {totalPages > 1 && (
        <nav className="mt-20 pt-10 border-t border-[var(--color-border)] flex items-center justify-between text-[14px]">
          <button
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className={`text-[var(--color-accent)] hover:underline disabled:opacity-30 disabled:no-underline`}
          >
            ← 上一页
          </button>
          
          <div className="text-[var(--color-text-muted)] tracking-widest font-serif">
            {safePage} / {totalPages}
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className={`text-[var(--color-accent)] hover:underline disabled:opacity-30 disabled:no-underline`}
          >
            下一页 →
          </button>
        </nav>
      )}

      {/* 全屏灯箱 */}
      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={lightboxSlides}
        plugins={[Fullscreen, Zoom]}
        styles={{ container: { backgroundColor: 'rgba(0, 0, 0, 0.94)' } }}
        controller={{ closeOnBackdropClick: true }}
      />
    </div>
  )
}

'use client'

/**
 * 相册列表组件
 *
 * 直接以瀑布流布局展示所有相册图片，无需分类筛选。
 * 点击图片可打开 Lightbox 全屏浏览。
 */
import { useState, useMemo } from 'react'
import PhotoAlbum from 'react-photo-album'
import Lightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'react-photo-album/styles.css'
import type { GalleryMeta } from '@/lib/gallery'

/** 每页展示的照片数量 */
const ITEMS_PER_PAGE = 24

/**
 * 将相册数据转换为 react-photo-album 所需的照片格式
 * 使用预定义的宽高比形成 2竖+1横 或 4竖 的错落布局
 */
function buildPhotos(albums: GalleryMeta[]) {
  // 交替横竖比例的序列，形成有节奏的瀑布流
  const ratios = [1.5, 0.67, 0.67, 1.5, 0.75, 0.67, 0.67, 1.5]

  const photos: Array<{
    src: string
    width: number
    height: number
    key: string
    alt: string
    title: string
    albumTitle: string
    albumSlug: string
  }> = []

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

  /** 所有照片（无分类筛选） */
  const allPhotos = useMemo(() => buildPhotos(albums), [albums])

  const totalPages = Math.max(1, Math.ceil(allPhotos.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pagedPhotos = allPhotos.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  )

  /** Lightbox 幻灯片数据 */
  const lightboxSlides = useMemo(
    () => pagedPhotos.map((p) => ({ src: p.src, alt: p.alt, title: p.albumTitle })),
    [pagedPhotos]
  )

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1
          className="text-[32px] font-bold mb-2"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          相册
        </h1>
        <p className="text-[15px]" style={{ color: 'var(--color-text-muted)' }}>
          随着快门的开启，时间被凝固下来，作为「此时此刻」的记录是不可重复的，也就成为永远。
        </p>
      </div>

      {/* 照片瀑布流布局 */}
      {pagedPhotos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[14px]" style={{ color: 'var(--color-text-hint)' }}>
            暂无照片
          </p>
        </div>
      ) : (
        <div className="gallery-grid">
          <PhotoAlbum
            layout="rows"
            photos={pagedPhotos}
            targetRowHeight={380}
            spacing={5}
            padding={0}
            rowConstraints={{ minPhotos: 2, maxPhotos: 4 }}
            onClick={({ index }) => setLightboxIndex(index)}
          />
        </div>
      )}

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div
          className="mt-10 flex items-center justify-center gap-1 text-[14px] font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {safePage > 1 ? (
            <button
              onClick={() => setPage(safePage - 1)}
              className="px-3 h-9 flex items-center justify-center rounded-[3px] transition-colors hover:text-[var(--color-accent)] bg-transparent border-0 cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              上一页
            </button>
          ) : (
            <span
              className="px-3 h-9 flex items-center justify-center rounded-[3px]"
              style={{ color: 'var(--color-text-hint)', cursor: 'not-allowed' }}
            >
              上一页
            </span>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) =>
            p === safePage ? (
              <span
                key={p}
                className="w-9 h-9 flex items-center justify-center rounded-[3px] text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {p}
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="w-9 h-9 flex items-center justify-center rounded-[3px] transition-colors hover:text-[var(--color-accent)] bg-transparent border-0 cursor-pointer"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {p}
              </button>
            )
          )}

          {safePage < totalPages ? (
            <button
              onClick={() => setPage(safePage + 1)}
              className="px-3 h-9 flex items-center justify-center rounded-[3px] transition-colors hover:text-[var(--color-accent)] bg-transparent border-0 cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              下一页
            </button>
          ) : (
            <span
              className="px-3 h-9 flex items-center justify-center rounded-[3px]"
              style={{ color: 'var(--color-text-hint)', cursor: 'not-allowed' }}
            >
              下一页
            </span>
          )}
        </div>
      )}

      {/* 全屏灯箱（Lightbox） */}
      <Lightbox
        open={lightboxIndex >= 0}
        index={lightboxIndex}
        close={() => setLightboxIndex(-1)}
        slides={lightboxSlides}
        plugins={[Fullscreen, Zoom]}
        styles={{
          container: {
            backgroundColor: 'rgba(0, 0, 0, 0.92)',
          },
        }}
        carousel={{ finite: false }}
        controller={{ closeOnBackdropClick: true }}
      />
    </div>
  )
}

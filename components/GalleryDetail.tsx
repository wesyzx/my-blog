'use client'

import { useState, useMemo } from 'react'
import PhotoAlbum from 'react-photo-album'
import Lightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'react-photo-album/styles.css'
import Link from 'next/link'
import type { GalleryItem } from '@/lib/gallery'

export default function GalleryDetail({ album }: { album: GalleryItem }) {
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const photos = useMemo(
    () => {
      const ratios = [1.5, 0.67, 0.67, 1.5, 0.75, 0.67, 0.67, 1.5]
      return album.images.map((src, i) => ({
        src,
        width: 1200,
        height: Math.round(1200 / ratios[i % ratios.length]),
        key: `${album.slug}-${i}`,
        alt: `${album.title} - ${i + 1}`,
        title: album.title,
      }))
    },
    [album.images, album.title, album.slug]
  )

  const lightboxSlides = useMemo(
    () => photos.map((p) => ({ src: p.src, alt: p.alt, title: p.title })),
    [photos]
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
          {album.title}
        </h1>
        {album.excerpt && (
          <p className="text-[15px] text-[var(--color-text-muted)]">
            {album.excerpt}
          </p>
        )}
      </header>

      {/* 照片瀑布流布局 */}
      {photos.length > 0 ? (
        <div className="gallery-grid">
          <PhotoAlbum
            layout="rows"
            photos={photos}
            targetRowHeight={380}
            spacing={8}
            padding={0}
            rowConstraints={{ minPhotos: 2, maxPhotos: 4 }}
            onClick={({ index }) => setLightboxIndex(index)}
          />
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-[var(--color-border)] rounded-xl">
          <p className="text-[14px] text-[var(--color-text-hint)]">
            本相册暂无照片
          </p>
        </div>
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

      {/* 返回首页 */}
      <div className="mt-20 text-center">
        <Link
          href="/gallery"
          className="text-[14px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          &larr; 返回相册
        </Link>
      </div>
    </div>
  )
}

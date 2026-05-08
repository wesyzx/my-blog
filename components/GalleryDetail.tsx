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
    <article className="max-w-[1100px] mx-auto">
      {/* 标题 */}
      <div className="text-center mb-8">
        <h1
          className="text-[28px] md:text-[34px] font-bold mb-3"
          style={{
            color: 'var(--color-heading)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          {album.title}
        </h1>
        {album.excerpt && (
          <p className="text-[14px]" style={{ color: 'var(--color-muted)' }}>
            {album.excerpt}
          </p>
        )}
      </div>

      {/* 照片 justified 布局 */}
      {photos.length > 0 && (
        <div className="gallery-grid">
          <PhotoAlbum
            layout="rows"
            photos={photos}
            targetRowHeight={380}
            spacing={5}
            padding={0}
            rowConstraints={{ minPhotos: 2, maxPhotos: 4 }}
            onClick={({ index }) => setLightboxIndex(index)}
          />
        </div>
      )}

      {/* Lightbox */}
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

      {/* 返回 */}
      <div className="text-center mt-10">
        <Link
          href="/gallery"
          className="text-[14px] font-medium transition-colors"
          style={{ color: 'var(--color-muted)' }}
        >
          &larr; 返回相册
        </Link>
      </div>
    </article>
  )
}

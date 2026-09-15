'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import PhotoAlbum from 'react-photo-album'
import Lightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'react-photo-album/styles.css'
import type { GalleryItem } from '@/lib/gallery'
import Icon from './Icon'

export default function GalleryDetail({ album }: { album: GalleryItem }) {
  const [index, setIndex] = useState(-1)
  const photos = useMemo(() => album.images.map((image, photoIndex) => ({ ...image, key: `${album.slug}-${photoIndex}`, alt: `${album.title} 照片 ${photoIndex + 1}` })), [album])

  return (
    <div className="page-shell animate-fade-up">
      <header className="page-header">
        <div className="page-header-meta editorial-meta">PORTFOLIO / 相册详情</div>
        <h1 className="page-title">{album.title}</h1>
        {album.excerpt && <p className="page-lead">{album.excerpt}</p>}
      </header>
      {photos.length > 0 ? (
        <PhotoAlbum
          layout="rows"
          photos={photos}
          targetRowHeight={360}
          spacing={10}
          padding={0}
          rowConstraints={{ minPhotos: 1, maxPhotos: 4 }}
          onClick={({ index: photoIndex }) => setIndex(photoIndex)}
        />
      ) : (
        <div className="empty-state">本相册暂无照片。</div>
      )}
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={photos}
        plugins={[Fullscreen, Zoom]}
        controller={{ closeOnBackdropClick: true }}
      />
      <div className="gallery-back">
        <Link href="/gallery" className="back-link">
          <Icon name="arrow-left" />
          <span>返回相册</span>
        </Link>
      </div>
    </div>
  )
}

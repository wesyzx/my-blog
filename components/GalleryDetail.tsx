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
import { formatItemDate } from '@/lib/format'
import Icon from './Icon'
import PageHeader from './PageHeader'

export default function GalleryDetail({ album }: { album: GalleryItem }) {
  const [index, setIndex] = useState(-1)
  const photos = useMemo(() => album.images.map((image, photoIndex) => ({ ...image, key: `${album.slug}-${photoIndex}`, alt: `${album.title} 照片 ${photoIndex + 1}` })), [album])

  return (
    <div className="page-shell animate-fade-up">
      <PageHeader title={album.title} eyebrow={formatItemDate(album.date)} description={album.excerpt} />
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

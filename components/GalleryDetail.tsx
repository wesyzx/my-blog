'use client'

import { useMemo } from 'react'
import BlogImage from '@/components/BlogImage'
import { blogImageUrl } from '@/lib/blog-images.mjs'
import Link from 'next/link'
import PhotoAlbum from 'react-photo-album'
import 'react-photo-album/styles.css'
import type { GalleryItem } from '@/lib/gallery'
import { formatItemDate } from '@/lib/format'
import Icon from './Icon'
import PageHeader from './PageHeader'
import ArtalkComments from './ArtalkComments'
import ImageLightbox from './ImageLightbox'

export default function GalleryDetail({ album }: { album: GalleryItem }) {
  const photos = useMemo(() => album.images.map((image, photoIndex) => ({ ...image, key: `${album.slug}-${photoIndex}`, alt: `${album.title} 照片 ${photoIndex + 1}` })), [album])

  return (
    <div className="page-shell animate-fade-up">
      <PageHeader title={album.title} eyebrow={formatItemDate(album.date)} description={album.excerpt} />
      {photos.length > 0 ? (
        <ImageLightbox>
          <PhotoAlbum
            layout="rows"
            photos={photos}
            targetRowHeight={360}
            spacing={10}
            padding={0}
            rowConstraints={{ minPhotos: 1, maxPhotos: 4 }}
            render={{
              image: ({ alt, title, className, style, sizes }, { photo }) => (
                <BlogImage
                  preset="fit"
                  src={photo.src}
                  alt={alt || ''}
                  title={title}
                  className={className}
                  style={style}
                  width={photo.width}
                  height={photo.height}
                  sizes={sizes || '(max-width: 860px) 100vw, 680px'}
                  data-lightbox-src={blogImageUrl(photo.src, { preset: 'full' })}
                  data-pswp-width={photo.width}
                  data-pswp-height={photo.height}
                />
              ),
            }}
          />
        </ImageLightbox>
      ) : (
        <div className="empty-state">本相册暂无照片。</div>
      )}
      <section className="comments-section">
        <h2 className="section-title">评论</h2>
        <ArtalkComments pageKey={`/gallery/${album.slug}`} pageTitle={album.title} />
      </section>
      <div className="gallery-back">
        <Link href="/gallery" className="back-link">
          <Icon name="arrow-left" />
          <span>返回相册</span>
        </Link>
      </div>
    </div>
  )
}

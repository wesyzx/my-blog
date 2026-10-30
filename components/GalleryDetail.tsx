'use client'

import Link from 'next/link'
import type { GalleryItem } from '@/lib/gallery'
import { formatItemDate } from '@/lib/format'
import Icon from './Icon'
import PageHeader from './PageHeader'
import ArtalkComments from './ArtalkComments'
import GalleryMosaic from './GalleryMosaic'

export default function GalleryDetail({ album }: { album: GalleryItem }) {
  return (
    <div className="page-shell gallery-page animate-fade-up" data-gallery-revision={album.publicationRevision}>
      <PageHeader title={album.title} eyebrow={formatItemDate(album.date)} description={album.excerpt} />
      {album.images.length > 0 ? (
        <GalleryMosaic images={album.images} title={album.title} />
      ) : (
        <div className="empty-state">本相册暂无照片。</div>
      )}
      <section className="comments-section">
        <h2 className="section-title">评论</h2>
        <ArtalkComments pageKey={`/gallery/${album.aliases?.[0] || album.slug}`} pageTitle={album.title} />
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

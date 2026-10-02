import type { GalleryMeta } from '@/lib/gallery'
import GalleryMoment from './GalleryMoment'
import PageHeader from './PageHeader'

export default function GalleryList({ albums }: { albums: GalleryMeta[] }) {
  return (
    <div className="page-shell animate-fade-up">
      <PageHeader title="相册" />

      {albums.length === 0 ? (
        <div className="empty-state">还没有相册。</div>
      ) : (
        <div className="moment-list">
          {albums.map((album) => <GalleryMoment album={album} key={album.slug} />)}
        </div>
      )}
    </div>
  )
}

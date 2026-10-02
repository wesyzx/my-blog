import type { GalleryMeta } from '@/lib/gallery'
import GalleryMoment from './GalleryMoment'

export default function GalleryList({ albums }: { albums: GalleryMeta[] }) {
  return (
    <div className="page-shell animate-fade-up">
      <header className="page-header">
        <h1 className="page-title">相册</h1>
      </header>

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

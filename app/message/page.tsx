import ArtalkComments from '@/components/ArtalkComments'
import { createPageMetadata } from '@/lib/metadata'

export const metadata = createPageMetadata({ title: '留言板', description: '欢迎留下建议、感悟，或是一句简单的问候。', path: '/message' })

export default function MessagePage() {
  return (
    <div className="page-shell narrow animate-fade-up">
      <header className="page-header">
        <h1 className="page-title">留言板</h1>
      </header>
      <ArtalkComments pageKey="/message" pageTitle="留言板" />
    </div>
  )
}

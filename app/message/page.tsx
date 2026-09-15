import ArtalkComments from '@/components/ArtalkComments'

export const metadata = { title: '留言板', description: '欢迎留下建议、感悟，或是一句简单的问候。' }

export default function MessagePage() {
  return (
    <div className="page-shell narrow animate-fade-up">
      <header className="page-header">
        <div className="page-header-meta editorial-meta">COMMUNICATION / 留言板</div>
        <h1 className="page-title">留言板</h1>
        <p className="page-lead">欢迎留下建议、感悟，或是一句简单的问候。</p>
      </header>
      <ArtalkComments pageKey="/message" pageTitle="留言板" />
    </div>
  )
}

import ArtalkComments from '@/components/ArtalkComments'

export default function MessagePage() {
  return (
    <div className="max-w-[800px] mx-auto">
      <div className="card p-[30px] md:p-[45px]">
        <h1
          className="text-[30px] font-bold mb-2"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          留言板
        </h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--color-text-muted)' }}>
          留下你的想法和建议
        </p>

        <ArtalkComments pageKey="/message" pageTitle="留言板" />
      </div>
    </div>
  )
}

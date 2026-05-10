import { getAllSays } from '@/lib/say'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function SayPage() {
  const says = getAllSays()

  return (
    <div className="max-w-[700px] mx-auto">
      <div className="card p-[30px] md:p-[40px]">
        <h1
          className="text-[30px] font-bold mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          说说
        </h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--color-text-muted)' }}>
          一些零碎的思考和日常
        </p>

        {says.length === 0 ? (
          <p className="text-center py-16 text-[var(--color-text-hint)] text-[15px]">
            还没有说说，在 Obsidian 的 content/say/ 目录下新建一条吧 ✍️
          </p>
        ) : (
          <div className="space-y-0">
            {says.map((say) => (
              <div
                key={say.slug}
                className="py-5"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <p
                  className="text-[15px] leading-[1.75] mb-3 whitespace-pre-wrap"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {say.content}
                </p>
                <div
                  className="flex items-center gap-3 text-[12px]"
                  style={{ color: 'var(--color-text-hint)' }}
                >
                  <span>{formatDate(say.date)}</span>
                  {say.pinned && (
                    <span className="tag-pill text-[11px]">📌 置顶</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

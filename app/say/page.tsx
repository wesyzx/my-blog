import { getAllSays } from '@/lib/say'
import WalineComments from '@/components/WalineComments'

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export default function SayPage() {
  const says = getAllSays()

  return (
    <div className="max-w-[700px] mx-auto">
      <div className="card p-[30px] md:p-[40px] mb-5">
        <h1
          className="text-[28px] font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          说说
        </h1>
        <p className="text-[14px] mb-0" style={{ color: 'var(--color-text-muted)' }}>
          零碎的思考和日常
        </p>
      </div>

      {says.length === 0 ? (
        <div className="card p-[40px] text-center">
          <p className="text-[var(--color-text-hint)] text-[15px]">
            还没有说说，在 Obsidian 的 content/say/ 目录下新建一条吧
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {says.map((say) => (
            <div key={say.slug} className="card p-[30px] md:p-[40px]">
              {/* 日期 */}
              <h2
                className="text-[18px] font-bold mb-5"
                style={{
                  color: 'var(--color-text-primary)',
                  fontFamily: "Georgia, 'Noto Serif SC', serif",
                }}
              >
                {formatDateFull(say.date)}
              </h2>

              {/* 正文 */}
              <div
                className="text-[15px] leading-[1.85] mb-6 whitespace-pre-wrap"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {say.content}
              </div>

              {/* 评论区 */}
              <WalineComments path={`/say/${say.slug}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

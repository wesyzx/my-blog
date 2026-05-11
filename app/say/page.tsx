import { getAllSays } from '@/lib/say'
import Image from 'next/image'
import SayCommentsToggle from '@/components/SayCommentsToggle'

const AUTHOR_AVATAR = 'https://img.guanyan.me/2026/05/fa7d85a90137299c295a3cdbe9790395.png'

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
          Can Chou 的零碎思考和日常
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
              {/* 作者信息行：小头像 + 名字 + 日期 */}
              <div className="flex items-center gap-3 mb-5">
                {/* 小头像 */}
                <div className="w-[36px] h-[36px] rounded-full flex-shrink-0 overflow-hidden">
                  <Image
                    src={AUTHOR_AVATAR}
                    alt="Can Chou"
                    width={36}
                    height={36}
                    className="object-cover"
                  />
                </div>

                {/* 名字和日期 */}
                <div className="flex flex-col">
                  <span
                    className="text-[14px] font-medium leading-tight"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Can Chou
                  </span>
                  <span
                    className="text-[12px] leading-tight mt-0.5"
                    style={{ color: 'var(--color-text-hint)' }}
                  >
                    {formatDateFull(say.date)}
                  </span>
                </div>
              </div>

              {/* 正文 - 大号字体 */}
              <div
                className="text-[17px] leading-[1.9] mb-5 whitespace-pre-wrap"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {say.content}
              </div>

              {/* 配图 */}
              {say.image && (
                <div className="mb-5 rounded-lg overflow-hidden">
                  <img
                    src={say.image}
                    alt=""
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
              )}

              {/* 评论按钮 — 右下角 */}
              <SayCommentsToggle pageKey={`/say/${say.slug}`} pageTitle={say.slug} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

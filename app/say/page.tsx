/**
 * 说说页面（短动态列表）
 *
 * 已应用极简单列布局标准。
 */
import { getAllSays } from '@/lib/say'
import Image from 'next/image'
import SayCommentsToggle from '@/components/SayCommentsToggle'

const AUTHOR_AVATAR = 'https://img.guanyan.me/2026/05/fa7d85a90137299c295a3cdbe9790395.png'

function formatDateFull(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function SayPage() {
  const says = getAllSays()

  return (
    <div className="max-w-[720px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      {/* 页面头部 */}
      <header className="mb-16">
        <h1
          className="text-[32px] md:text-[40px] font-bold mb-4"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          说说
        </h1>
        <p className="text-[15px] text-[var(--color-text-muted)]">
          零碎的思考、瞬间的感悟，以及生活的日常。
        </p>
      </header>

      {says.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-[var(--color-border)] rounded-xl">
          <p className="text-[var(--color-text-hint)] text-[15px]">
            还没有说说，在 Obsidian 的 content/say/ 目录下新建一条吧
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {says.map((say) => (
            <div key={say.slug} className="pb-12 border-b border-[var(--color-border)] last:border-0">
              {/* 作者信息行 */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-[40px] h-[40px] rounded-full flex-shrink-0 overflow-hidden border border-[var(--color-border)]">
                  <Image
                    src={AUTHOR_AVATAR}
                    alt="Can Chou"
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-[var(--color-text-primary)]">
                    Can Chou
                  </span>
                  <span className="text-[12px] text-[var(--color-text-hint)]">
                    {formatDateFull(say.date)}
                  </span>
                </div>
              </div>

              {/* 正文 */}
              <div
                className="text-[17px] md:text-[18px] leading-[1.8] mb-6 whitespace-pre-wrap text-[var(--color-text-secondary)]"
              >
                {say.content}
              </div>

              {/* 配图 */}
              {say.image && (
                <div className="mb-6 rounded-xl overflow-hidden shadow-sm border border-[var(--color-border)]">
                  <img
                    src={say.image}
                    alt=""
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
              )}

              {/* 评论按钮 */}
              <SayCommentsToggle pageKey={`/say/${say.slug}`} pageTitle={say.slug} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import React from "react";

const says = [
  {
    id: 1,
    content: '天气真好，适合出去走走。最近在研究 Next.js 16 的新特性，感觉 App Router 越来越成熟了。',
    date: '2026年4月20日',
    likes: 5,
  },
  {
    id: 2,
    content: '推荐一款自用三年的记账 App —— Cookie 记账。简洁、无广告、iCloud 同步，完全符合我的需求。',
    date: '2026年4月15日',
    likes: 12,
  },
  {
    id: 3,
    content: '今天读到一句话："不慌不忙，一切都是最好的安排。" 深以为然。',
    date: '2026年4月10日',
    likes: 8,
    pinned: true,
  },
  {
    id: 4,
    content: '摄影真的是让人静下心来的好方式。今天拍到了很满意的日落，改天整理一下发到相册里。',
    date: '2026年4月5日',
    likes: 3,
  },
  {
    id: 5,
    content: '刚把博客从 WordPress 迁移到了 Next.js，整个过程比想象中顺利。后续会分享一下迁移经验。',
    date: '2026年3月28日',
    likes: 15,
  },
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function SayPage() {
  return (
    <div className="max-w-[700px] mx-auto">
      <div className="card p-[30px] md:p-[40px]">
        <h1 className="text-[30px] font-bold mb-2" style={{ color: 'var(--color-heading)' }}>
          说说
        </h1>
        <p className="text-[15px] mb-8" style={{ color: 'var(--color-muted)' }}>
          一些零碎的思考和日常
        </p>

        <div className="space-y-0">
          {says.map((say) => (
            <div
              key={say.id}
              className="py-5"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <p className="text-[15px] leading-[1.75] mb-3" style={{ color: 'var(--color-body)' }}>
                {say.content}
              </p>
              <div className="flex items-center justify-between text-[12px]" style={{ color: 'var(--color-light)' }}>
                <div className="flex items-center gap-3">
                  <span>{say.date}</span>
                  {say.pinned && (
                    <span className="tag text-[11px]">置顶</span>
                  )}
                </div>
                <button
                  className="flex items-center gap-1 transition-colors hover:text-[var(--color-primary)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                  {say.likes}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

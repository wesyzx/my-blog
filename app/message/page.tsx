'use client'

/**
 * 留言板页面
 *
 * 已应用极简单列布局标准。
 * 移除了占位图，优化了纵向间距以减少空白感。
 */
import { useState, useEffect } from 'react'
import ArtalkComments from '@/components/ArtalkComments'

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
const SITE = '莫赶'

export default function MessagePage() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({
      site_name: SITE,
      page_key: '/message',
      limit: '1',
      flat_mode: 'true',
    })
    fetch(`${SERVER}/api/v2/comments?${params.toString()}`)
      .then((res) => res.json())
      .then((data: any) => {
        const t =
          typeof data?.count === 'number' ? data.count :
          typeof data?.total === 'number' ? data.total :
          typeof data?.data?.total === 'number' ? data.data.total :
          Array.isArray(data?.data) ? data.data.length :
          null
        if (typeof t === 'number') setCount(t)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-[720px] mx-auto px-6 py-12 md:py-20 animate-fade-up">
      {/* 页面头部 */}
      <header className="mb-12">
        <h1
          className="text-[32px] md:text-[40px] font-bold mb-4"
          style={{
            color: 'var(--color-text-primary)',
            fontFamily: "Georgia, 'Noto Serif SC', serif",
          }}
        >
          留言板
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[15px] text-[var(--color-text-muted)]">
          <p>感谢缘分让我们相遇，一切都是最好的安排。</p>
          {count !== null && (
            <span className="text-[var(--color-accent)] font-medium">
              {count} 评论
            </span>
          )}
        </div>
      </header>

      {/* 欢迎引导语 */}
      <div className="prose max-w-none mb-12">
        <blockquote
          className="border-l-[3px] border-[var(--color-accent)] bg-[var(--color-bg-surface)] px-6 py-4 rounded-r-lg not-italic text-[16px] text-[var(--color-text-secondary)]"
        >
          欢迎在这里留下你的足迹。无论是建议、感悟还是简单的问候，我都会认真阅读并回复。
        </blockquote>
      </div>

      {/* 评论区 */}
      <div className="mt-12">
        <ArtalkComments pageKey="/message" pageTitle="留言板" />
      </div>
    </div>
  )
}

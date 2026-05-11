'use client'

import { useState, useEffect } from 'react'
import ArtalkComments from '@/components/ArtalkComments'

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
const SITE = '不赶'

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
    <div className="max-w-[800px] mx-auto">
      {/* 留言板介绍卡片 */}
      <div className="card overflow-hidden mb-5">
        {/* 装饰头图 — 替换 src 为实际图片路径 */}
        <div className="h-[200px] md:h-[260px] bg-[var(--color-bg-surface)] flex items-center justify-center">
          <span className="text-[13px]" style={{ color: 'var(--color-text-hint)' }}>
            留言板头图
          </span>
        </div>

        <div className="p-[30px] md:p-[45px]">
          <h1
            className="text-[30px] font-bold mb-4"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            留言板
          </h1>

          <p
            className="text-[18px] font-bold mb-2"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "Georgia, 'Noto Serif SC', serif",
            }}
          >
            感谢缘分让我们相遇
          </p>

          <p className="text-[15px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
            一切都是最好的安排
          </p>

          <blockquote
            className="border-l-[3px] pl-4 py-1 mb-4 text-[15px]"
            style={{
              borderColor: 'var(--color-accent)',
              color: 'var(--color-text-secondary)',
              fontStyle: 'italic',
            }}
          >
            欢迎在评论区留言
          </blockquote>

          {count !== null && (
            <p className="text-[14px] font-medium" style={{ color: 'var(--color-accent)' }}>
              {count} 评论
            </p>
          )}
        </div>
      </div>

      {/* 评论区域 */}
      <div className="card p-[30px] md:p-[45px]">
        <ArtalkComments pageKey="/message" pageTitle="留言板" />
      </div>
    </div>
  )
}

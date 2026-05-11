'use client'

import { useState, useEffect } from 'react'
import ArtalkComments from './ArtalkComments'

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
const SITE = '不赶'

interface SayCommentsToggleProps {
  pageKey: string
  pageTitle: string
}

export default function SayCommentsToggle({ pageKey, pageTitle }: SayCommentsToggleProps) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({
      site_name: SITE,
      page_key: pageKey,
    })
    // 使用 Artalk stats API 获取单页评论数（更轻量、可靠）
    fetch(`${SERVER}/api/v2/stats/page_comment?${params.toString()}`)
      .then((res) => res.json())
      .then((data: any) => {
        // stats API 返回 { data: N } 或直接返回数字
        const t =
          typeof data?.data === 'number' ? data.data :
          typeof data === 'number' ? data :
          null
        if (typeof t === 'number') setCount(t)
      })
      .catch((e) => {
        console.error('Artalk stats API 获取失败:', e)
      })
  }, [pageKey])

  return (
    <div>
      <div className="flex justify-end mt-4">
        <button
          onClick={() => setOpen(!open)}
          className="text-[12px] transition-colors hover:text-[var(--color-accent)]"
          style={{ color: 'var(--color-text-hint)' }}
        >
          {open ? '收起评论' : `评论${count !== null ? `（${count}）` : ''}`}
        </button>
      </div>
      {open && <ArtalkComments pageKey={pageKey} pageTitle={pageTitle} />}
    </div>
  )
}

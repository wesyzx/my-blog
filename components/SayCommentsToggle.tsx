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
    // 从 Artalk API 获取该页面的评论数量
    const params = new URLSearchParams({
      site_name: SITE,
      page_key: pageKey,
      type: 'page_comment',
    })
    fetch(`${SERVER}/api/v2/stats?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const c = data?.data?.comment_count
        if (typeof c === 'number') {
          setCount(c)
        }
      })
      .catch(() => {})
  }, [pageKey])

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-[13px] font-medium transition-colors hover:text-[var(--color-accent)]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {open ? '收起评论' : `评论${count !== null ? ` (${count})` : ''}`}
      </button>
      {open && <ArtalkComments pageKey={pageKey} pageTitle={pageTitle} />}
    </div>
  )
}

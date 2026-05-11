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
    // 请求留言列表（limit=1），从响应中提取 total 作为评论数
    const params = new URLSearchParams({
      site_name: SITE,
      page_key: pageKey,
      limit: '1',
      flat_mode: 'true',
    })
    fetch(`${SERVER}/api/v2/comment?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        // 兼容多种响应格式：{ total, data: { total }, data: { comments: [...] }, data: [...], ... }
        const t =
          typeof data?.total === 'number' ? data.total :
          typeof data?.data?.total === 'number' ? data.data.total :
          Array.isArray(data?.data?.comments) ? data.data.comments.length :
          Array.isArray(data?.data) ? data.data.length :
          null
        if (typeof t === 'number') setCount(t)
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

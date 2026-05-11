'use client'

import { useState, useEffect } from 'react'
import ArtalkComments from './ArtalkComments'

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
const SITE = '不赶'

interface SayCommentsToggleProps {
  pageKey: string
  pageTitle: string
}

/**
 * 说说评论收折组件
 * - Artalk API 获取评论数展示在按钮上
 * - 点击展开/收起评论区
 */
export default function SayCommentsToggle({ pageKey, pageTitle }: SayCommentsToggleProps) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({
      site_name: SITE,
      page_key: pageKey,
      limit: '1',
      flat_mode: 'true',
    })
    fetch(`${SERVER}/api/v2/comments?${params.toString()}`)
      .then((res) => res.json())
      .then((data: any) => {
        const t =
          typeof data?.total === 'number' ? data.total :
          typeof data?.data?.total === 'number' ? data.data.total :
          Array.isArray(data?.data) ? data.data.length :
          null
        if (typeof t === 'number') setCount(t)
      })
      .catch(() => {})
  }, [pageKey])

  return (
    <div className="mt-4">
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

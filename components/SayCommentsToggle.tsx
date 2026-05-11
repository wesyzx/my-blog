'use client'

import { useState } from 'react'
import ArtalkComments from './ArtalkComments'

interface SayCommentsToggleProps {
  pageKey: string
  pageTitle: string
}

/**
 * 说说评论收折组件
 * 默认隐藏评论区，点击「评论」按钮后展开 Artalk
 */
export default function SayCommentsToggle({ pageKey, pageTitle }: SayCommentsToggleProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(!open)}
        className="text-[13px] font-medium transition-colors hover:text-[var(--color-accent)]"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {open ? '收起评论' : '评论'}
      </button>
      {open && <ArtalkComments pageKey={pageKey} pageTitle={pageTitle} />}
    </div>
  )
}

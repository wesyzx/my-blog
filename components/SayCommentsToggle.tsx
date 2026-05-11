'use client'

import { useState, useEffect, useCallback } from 'react'
import ArtalkComments from './ArtalkComments'

interface SayCommentsToggleProps {
  pageKey: string
  pageTitle: string
}

const COUNT_CACHE_KEY = 'artalk_count_'

function getCachedCount(pageKey: string): number | null {
  try {
    const v = localStorage.getItem(COUNT_CACHE_KEY + pageKey)
    return v ? parseInt(v, 10) : null
  } catch { return null }
}

function setCachedCount(pageKey: string, count: number) {
  try { localStorage.setItem(COUNT_CACHE_KEY + pageKey, String(count)) } catch {}
}

/**
 * 说说评论收折组件
 * - 默认显示「评论」按钮
 * - 优先从 localStorage 读取缓存的评论数展示
 * - 展开后监听 Artalk DOM，读取真实评论数并更新缓存
 */
export default function SayCommentsToggle({ pageKey, pageTitle }: SayCommentsToggleProps) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState<number | null>(() => getCachedCount(pageKey))

  // Artalk 加载完成后从 DOM 中读取评论数
  const onArtalkReady = useCallback(() => {
    // Artalk 渲染后会在 DOM 中显示评论总数，尝试读取
    const tryRead = () => {
      const el = document.querySelector('.atk-comment-count, [data-atk-comment-count]')
      if (el) {
        const n = parseInt(el.textContent || '', 10)
        if (!isNaN(n)) {
          setCount(n)
          setCachedCount(pageKey, n)
          return
        }
      }
      // 降级：数评论列表项
      const items = document.querySelectorAll('.atk-comment')
      if (items.length > 0) {
        setCount(items.length)
        setCachedCount(pageKey, items.length)
      }
    }
    // Artalk 异步渲染，延迟一下再读
    setTimeout(tryRead, 800)
    setTimeout(tryRead, 2000)
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
      {open && (
        <ArtalkComments
          pageKey={pageKey}
          pageTitle={pageTitle}
          onReady={onArtalkReady}
        />
      )}
    </div>
  )
}

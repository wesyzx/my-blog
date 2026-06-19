'use client'

/**
 * 说说评论收折组件
 *
 * - 通过 Artalk API 获取单页评论数，显示为「评论（N）」
 * - 按钮位于右下角，点击展开/收起评论区
 * - 中文括号格式，与页面整体设计保持一致
 */
import { useState, useEffect } from 'react'
import ArtalkComments from './ArtalkComments'

/** Artalk 服务端地址，优先读取环境变量 */
const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
/** 站点名称，与 Artalk 管理面板配置一致 */
const SITE = '轨道之外'

interface SayCommentsToggleProps {
  /** 页面唯一标识，如 /say/hello-world */
  pageKey: string
  /** 页面标题，显示在 Artalk 管理面板 */
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
    // 使用 stats 接口获取页面评论数，更高效可靠
    fetch(`${SERVER}/api/v2/stats/page_comment?${params.toString()}`)
      .then((res) => res.json())
      .then((data: any) => {
        // Artalk stats API 返回格式通常为 { data: { "/key": count } }
        const t = data?.data?.[pageKey]
        if (typeof t === 'number') setCount(t)
      })
      .catch(() => {})
  }, [pageKey])

  return (
    <div>
      {/* 按钮右对齐，使用 muted/hint 色系保持低调 */}
      <div className="flex justify-end mt-4">
        <button
          onClick={() => setOpen(!open)}
          className="text-[12px] transition-colors hover:text-[var(--color-accent)]"
          style={{ color: 'var(--color-text-hint)' }}
        >
          {open ? '收起评论' : `评论${count !== null ? `（${count}）` : ''}`}
        </button>
      </div>
      {/* 展开后才加载 Artalk，避免首屏不必要的 JS/CSS 加载 */}
      {open && <ArtalkComments pageKey={pageKey} pageTitle={pageTitle} />}
    </div>
  )
}

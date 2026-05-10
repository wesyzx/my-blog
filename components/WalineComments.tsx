'use client'

import { useEffect, useRef } from 'react'

interface WalineCommentsProps {
  /** 页面路径，用作评论线程标识 */
  path: string
  /** 是否展示 serverURL 未配置的提示 */
  showPlaceholder?: boolean
}

export default function WalineComments({
  path,
  showPlaceholder = true,
}: WalineCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    const serverURL = process.env.NEXT_PUBLIC_WALINE_SERVER
    if (!serverURL || !containerRef.current || initializedRef.current) return

    initializedRef.current = true

    import('@waline/client').then(({ init }) => {
      init({
        el: containerRef.current!,
        serverURL,
        path,
        lang: 'zh-CN',
        dark: false,
        login: 'disable',
        pageSize: 10,
        meta: ['nick'],
        imageUploader: false,
        locale: {
          placeholder: '写下你的想法...',
        },
      })
    })
  }, [path])

  const serverURL = process.env.NEXT_PUBLIC_WALINE_SERVER

  return (
    <div
      ref={containerRef}
      className="mt-6 pt-6"
      style={{ borderTop: '0.5px solid var(--color-border)' }}
    >
      {!serverURL && showPlaceholder && (
        <p className="text-[13px] text-[var(--color-text-hint)]">
          评论系统未配置。设置 <code className="text-[12px] bg-[var(--color-bg-surface)] px-1 rounded">NEXT_PUBLIC_WALINE_SERVER</code> 环境变量后生效。
        </p>
      )}
    </div>
  )
}

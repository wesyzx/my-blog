'use client'

import { useEffect, useRef } from 'react'

interface ArtalkCommentsProps {
  /** 页面路径，用作评论线程标识，如 "/posts/hello-world" */
  pageKey: string
  /** 页面标题（可选，显示在 Artalk 管理面板中） */
  pageTitle?: string
}

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
const SITE = '不赶'

export default function ArtalkComments({ pageKey, pageTitle }: ArtalkCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    // 加载 Artalk CSS
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = `${SERVER}/dist/Artalk.css`
    document.head.appendChild(css)

    // 加载 Artalk JS 并初始化
    const script = document.createElement('script')
    script.src = `${SERVER}/dist/Artalk.js`
    script.onload = () => {
      if (containerRef.current && (window as any).Artalk) {
        ;(window as any).Artalk.init({
          el: containerRef.current,
          server: SERVER,
          site: SITE,
          pageKey,
          pageTitle,
        })
      }
    }
    document.body.appendChild(script)
  }, [pageKey, pageTitle])

  return (
    <div
      ref={containerRef}
      className="mt-6 pt-6"
      style={{ borderTop: '0.5px solid var(--color-border)' }}
    />
  )
}

'use client'

/**
 * Artalk 评论组件
 *
 * 动态加载 Artalk 的 CSS/JS 资源并初始化评论系统。
 * 为避免重复加载，使用 ref 标记已初始化的容器。
 *
 * 使用方式：
 *   <ArtalkComments pageKey="/posts/my-slug" pageTitle="文章标题" />
 */
import { useEffect, useRef } from 'react'

interface ArtalkCommentsProps {
  /** 页面路径，用作评论线程唯一标识（如 /posts/my-slug） */
  pageKey: string
  /** 页面标题，显示在 Artalk 管理面板中 */
  pageTitle?: string
}

/** Artalk 服务端地址 */
const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
/** 站点名称 */
const SITE = '不赶'

export default function ArtalkComments({ pageKey, pageTitle }: ArtalkCommentsProps) {
  /** 评论区 DOM 容器 */
  const containerRef = useRef<HTMLDivElement>(null)
  /** 防止 React Strict Mode 下重复初始化 */
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    // 动态加载 Artalk CSS 样式文件
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = `${SERVER}/dist/Artalk.css`
    document.head.appendChild(css)

    // 动态加载 Artalk JS 并初始化评论实例
    const script = document.createElement('script')
    script.src = `${SERVER}/dist/Artalk.js`
    script.onload = () => {
      if (containerRef.current && (window as any).Artalk) {
        ;(window as any).Artalk.init({
          el: containerRef.current,        // 挂载容器
          server: SERVER,                  // 后端地址
          site: SITE,                      // 站点名
          pageKey,                         // 页面唯一标识
          pageTitle,                       // 页面标题
          requiredMeta: ['nick', 'mail'],  // 必填项：昵称 + 邮箱
          flatMode: true,                  // 平铺模式（非嵌套回复）
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

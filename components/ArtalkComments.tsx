'use client'

/**
 * Artalk 评论组件
 *
 * 使用 next/script 动态加载 Artalk 资源并初始化。
 *
 * 使用方式：
 *   <ArtalkComments pageKey="/posts/my-slug" pageTitle="文章标题" />
 */
import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

interface ArtalkCommentsProps {
  pageKey: string
  pageTitle?: string
}

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
const SITE = '莫赶'

export default function ArtalkComments({ pageKey, pageTitle }: ArtalkCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  // 动态加载 CSS
  useEffect(() => {
    const cssId = 'artalk-css'
    if (!document.getElementById(cssId)) {
      const css = document.createElement('link')
      css.id = cssId
      css.rel = 'stylesheet'
      css.href = `${SERVER}/dist/Artalk.css`
      document.head.appendChild(css)
    }
  }, [])

  // 当脚本加载完成且组件挂载后初始化 Artalk
  useEffect(() => {
    if (isScriptLoaded && containerRef.current && (window as any).Artalk) {
      const artalk = (window as any).Artalk.init({
        el: containerRef.current,
        server: SERVER,
        site: SITE,
        pageKey,
        pageTitle,
        requiredMeta: ['nick', 'mail'],
        flatMode: true,
      })

      return () => {
        artalk.destroy()
      }
    }
  }, [pageKey, pageTitle, isScriptLoaded])

  return (
    <>
      <Script 
        src={`${SERVER}/dist/Artalk.js`} 
        strategy="lazyOnload"
        onLoad={() => setIsScriptLoaded(true)}
      />
      <div
        ref={containerRef}
        className="mt-6 pt-6"
        style={{ borderTop: '0.5px solid var(--color-border)' }}
      />
    </>
  )
}

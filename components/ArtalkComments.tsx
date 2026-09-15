'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

interface ArtalkInstance { setDarkMode: (dark: boolean) => void; destroy: () => void }
interface ArtalkApi { init: (options: Record<string, unknown>) => ArtalkInstance }
declare global { interface Window { Artalk?: ArtalkApi } }

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'

export default function ArtalkComments({ pageKey, pageTitle }: { pageKey: string; pageTitle?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (document.getElementById('artalk-css')) return
    const css = document.createElement('link')
    css.id = 'artalk-css'
    css.rel = 'stylesheet'
    css.href = `${SERVER}/dist/Artalk.css`
    document.head.appendChild(css)
  }, [])

  useEffect(() => {
    if (!isReady || !containerRef.current || !window.Artalk) return
    const getTheme = () => document.documentElement.dataset.theme === 'dark'
    const artalk = window.Artalk.init({ el: containerRef.current, server: SERVER, site: '轨道之外', pageKey, pageTitle, requiredMeta: ['nick', 'mail'], flatMode: true, darkMode: getTheme() })
    const observer = new MutationObserver(() => artalk.setDarkMode(getTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { artalk.destroy(); observer.disconnect() }
  }, [pageKey, pageTitle, isReady])

  return <><Script src={`${SERVER}/dist/Artalk.js`} strategy="lazyOnload" onReady={() => setIsReady(true)} /><div ref={containerRef} className="artalk-container" /></>
}

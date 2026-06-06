'use client'

/**
 * 自建访客统计组件
 *
 * 通过 Artalk API 记录并展示页面浏览量，替代不蒜子。
 * Artalk 服务端 CORS 已配置允许 https://guanyan.me。
 */
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const SERVER = 'https://artalk.guanyan.me'
const SITE = '莫赶'

export default function VisitorStats() {
  const pathname = usePathname()
  const [sitePv, setSitePv] = useState<number | null>(null)
  const tried = useRef(false)

  useEffect(() => {
    if (tried.current) return
    tried.current = true

    const ctrl = new AbortController()

    async function run() {
      // 记录 PV
      try {
        await fetch(`${SERVER}/api/v2/pages/pv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_key: pathname,
            page_title: typeof document !== 'undefined' ? document.title : pathname,
            site_name: SITE,
          }),
          signal: ctrl.signal,
        })
      } catch (e) {
        console.error('[VisitorStats] PV record failed:', e)
      }

      // 查询汇总
      try {
        const sitePages = ['/', '/about', '/food', '/gallery', '/message', '/say']
        const res = await fetch(
          `${SERVER}/api/v2/stats/page_pv?page_keys=${sitePages.map(encodeURIComponent).join(',')}&site_name=${encodeURIComponent(SITE)}`,
          { signal: ctrl.signal }
        )
        const json = await res.json()
        console.log('[VisitorStats] stats response:', json)
        if (json.data) {
          const total = Object.values(json.data).reduce(
            (sum: number, v: unknown) => sum + (typeof v === 'number' ? v : 0),
            0
          )
          setSitePv(total)
        }
      } catch (e) {
        console.error('[VisitorStats] stats query failed:', e)
      }
    }

    run()
    return () => ctrl.abort()
  }, [pathname])

  return (
    <span style={{ color: 'var(--color-text-muted)' }}>
      总浏览{' '}
      <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
        {sitePv !== null ? sitePv.toLocaleString() : '-'}
      </span>{' '}
      次
    </span>
  )
}

'use client'

/**
 * 自建访客统计组件
 *
 * 通过 Artalk API 记录并展示页面浏览量，替代不蒜子。
 * - POST /api/v2/pages/pv  记录当前页面访问
 * - GET  /api/v2/stats/page_pv  查询站点页面 PV 并汇总
 */
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
const SITE = '莫赶'

export default function VisitorStats() {
  const pathname = usePathname()
  const [sitePv, setSitePv] = useState<number | null>(null)
  const [reported, setReported] = useState(false)

  // 记录 PV（路径变化时重新上报，覆盖客户端导航）
  useEffect(() => {
    setReported(false)
  }, [pathname])

  useEffect(() => {
    if (reported) return
    let cancelled = false

    async function recordAndFetch() {
      try {
        await fetch(`${SERVER}/api/v2/pages/pv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_key: pathname,
            page_title: document.title || pathname,
            site_name: SITE,
          }),
        })
      } catch {
        // 记录失败不影响展示
      }

      if (!cancelled) setReported(true)

      try {
        const sitePages = ['/', '/about', '/food', '/gallery', '/message', '/say']
        const res = await fetch(
          `${SERVER}/api/v2/stats/page_pv?page_keys=${sitePages.join(',')}&site_name=${SITE}`
        )
        const json = await res.json()
        if (!cancelled && json.data) {
          const total = Object.values(json.data).reduce(
            (sum: number, v: unknown) => sum + (typeof v === 'number' ? v : 0),
            0
          )
          setSitePv(total)
        }
      } catch {
        // 查询失败显示 -
      }
    }

    recordAndFetch()

    return () => { cancelled = true }
  }, [pathname, reported])

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

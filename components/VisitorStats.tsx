'use client'

/**
 * 自建访客统计组件
 *
 * 直接调用 Artalk API 记录并展示页面浏览量。
 * Artalk 服务端 CORS 已配置允许 https://guanyan.me，自定义域名下正常工作。
 *
 * 注意：EdgeOne 预览域名下会被 CORS 拦截，属于预期行为。
 */
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

const SERVER = 'https://artalk.guanyan.me'
const SITE = '莫赶'

export default function VisitorStats() {
  const pathname = usePathname()
  const [sitePv, setSitePv] = useState<number | null>(null)
  const [reported, setReported] = useState(false)

  useEffect(() => {
    setReported(false)
  }, [pathname])

  useEffect(() => {
    if (reported) return
    let cancelled = false

    async function run() {
      // 1. 记录本次页面访问
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
        // 记录失败不阻断
      }

      if (!cancelled) setReported(true)

      // 2. 拉取站点 PV 汇总
      try {
        const sitePages = ['/', '/about', '/food', '/gallery', '/message', '/say']
        const res = await fetch(
          `${SERVER}/api/v2/stats/page_pv?page_keys=${sitePages.join(',')}&site_name=${encodeURIComponent(SITE)}`
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
        // 查询失败保持 -
      }
    }

    run()
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

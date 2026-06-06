'use client'

/**
 * 自建访客统计组件
 *
 * PV 记录与查询通过本地 /api/visitor 代理转发到 Artalk，
 * 避免浏览器直接请求 Artalk 服务器时的 CORS 问题。
 */
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

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
      // 1. 记录本次访问
      try {
        await fetch('/api/visitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageKey: pathname, pageTitle: document.title }),
        })
      } catch {
        // 记录失败不阻断
      }

      if (!cancelled) setReported(true)

      // 2. 拉取站点 PV 汇总
      try {
        const res = await fetch('/api/visitor')
        const json = await res.json()
        if (!cancelled && typeof json.pv === 'number' && json.pv >= 0) {
          setSitePv(json.pv)
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

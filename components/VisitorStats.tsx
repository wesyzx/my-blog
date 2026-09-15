'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'

function sumPageViews(value: unknown): number | null {
  if (!value || typeof value !== 'object' || !('data' in value)) return null
  const data = (value as { data?: unknown }).data
  if (!data || typeof data !== 'object') return null
  return Object.values(data).reduce<number>((sum, item) => sum + (typeof item === 'number' ? item : 0), 0)
}

export default function VisitorStats({ pageKeys }: { pageKeys: string[] }) {
  const pathname = usePathname()
  const [sitePv, setSitePv] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const siteName = encodeURIComponent('轨道之外')

    fetch(`${SERVER}/api/v2/pages/pv`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_key: pathname, page_title: document.title, site_name: '轨道之外' }), signal: controller.signal,
    }).catch(() => undefined)

    const keys = pageKeys.map(encodeURIComponent).join(',')
    fetch(`${SERVER}/api/v2/stats/page_pv?page_keys=${keys}&site_name=${siteName}`, { signal: controller.signal })
      .then((response) => response.json()).then((data: unknown) => setSitePv(sumPageViews(data))).catch(() => undefined)

    return () => controller.abort()
  }, [pageKeys, pathname])

  return <span>总浏览 <strong>{sitePv === null ? '—' : sitePv.toLocaleString()}</strong> 次</span>
}

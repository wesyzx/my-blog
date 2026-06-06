/**
 * Artalk 代理路由 —— 绕过浏览器 CORS 限制
 *
 * GET  /api/visitor → 查询站点页面 PV 汇总
 * POST /api/visitor → 记录当前页面访问
 */
import { NextRequest, NextResponse } from 'next/server'

const ARTALK = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'
const SITE = '莫赶'

export async function GET() {
  try {
    const sitePages = ['/', '/about', '/food', '/gallery', '/message', '/say']
    const res = await fetch(
      `${ARTALK}/api/v2/stats/page_pv?page_keys=${sitePages.join(',')}&site_name=${encodeURIComponent(SITE)}`
    )
    const json = await res.json()

    if (json.data) {
      const total = Object.values(json.data).reduce(
        (sum: number, v: unknown) => sum + (typeof v === 'number' ? v : 0),
        0
      )
      return NextResponse.json({ pv: total })
    }
    return NextResponse.json({ pv: -1 })
  } catch {
    return NextResponse.json({ pv: -1 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const artalkRes = await fetch(`${ARTALK}/api/v2/pages/pv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_key: body.pageKey || '/',
        page_title: body.pageTitle || '',
        site_name: SITE,
      }),
    })
    const json = await artalkRes.json()
    return NextResponse.json({ pv: json.pv ?? -1 })
  } catch {
    return NextResponse.json({ pv: -1 })
  }
}

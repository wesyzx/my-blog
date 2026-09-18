import { NextResponse } from 'next/server'

/**
 * Memos 的 /file/** 端点强制鉴权（匿名访问返回 401），浏览器与 next/image 都拿不到图。
 * 这个路由在服务端补上 Bearer token 再转发，并且只放行 attachments 下的图片路径，
 * 避免变成一个可以任意转发的开放代理。
 */
const MEMOS_BASE_URL = process.env.MEMOS_BASE_URL || 'https://memos.guanyan.me'
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params

  if (!Array.isArray(path) || path[0] !== 'attachments' || path.length !== 3 || !path.every((segment) => SAFE_SEGMENT.test(segment))) {
    return NextResponse.json({ error: 'Unsupported Memos file path' }, { status: 400 })
  }

  if (!process.env.MEMOS_TOKEN) {
    return NextResponse.json({ error: 'MEMOS_TOKEN is not configured' }, { status: 500 })
  }

  const upstream = await fetch(`${MEMOS_BASE_URL}/file/${path.join('/')}`, {
    headers: { Authorization: `Bearer ${process.env.MEMOS_TOKEN}` },
    next: { revalidate: 86400 },
  })

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Memos returned HTTP ${upstream.status}` }, { status: upstream.status === 404 ? 404 : 502 })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}

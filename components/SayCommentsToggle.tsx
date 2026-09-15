'use client'

import { useEffect, useState } from 'react'
import ArtalkComments from './ArtalkComments'
import Icon from './Icon'

const SERVER = process.env.NEXT_PUBLIC_ARTALK_SERVER || 'https://artalk.guanyan.me'

function getCommentCount(value: unknown, pageKey: string) {
  if (!value || typeof value !== 'object') return null
  const data = 'data' in value ? value.data : null
  if (!data || typeof data !== 'object') return null
  const count = (data as Record<string, unknown>)[pageKey]
  return typeof count === 'number' ? count : null
}

export default function SayCommentsToggle({ pageKey, pageTitle }: { pageKey: string; pageTitle: string }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({ site_name: '轨道之外', page_key: pageKey })
    fetch(`${SERVER}/api/v2/stats/page_comment?${params}`).then((response) => response.json()).then((data: unknown) => setCount(getCommentCount(data, pageKey))).catch(() => undefined)
  }, [pageKey])

  return <div className="say-comments"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}><Icon name="comment" />{open ? '收起评论' : `评论${count === null ? '' : ` ${count}`}`}</button>{open && <ArtalkComments pageKey={pageKey} pageTitle={pageTitle} />}</div>
}

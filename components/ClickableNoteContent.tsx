'use client'

import type { MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import SafeMarkdown from './SafeMarkdown'

export default function ClickableNoteContent({ source, href }: { source: string; href: string }) {
  const router = useRouter()

  const openNote = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target
    if (target instanceof Element && target.closest('a, button, input, textarea, select')) return
    if (window.getSelection()?.toString()) return
    router.push(href)
  }

  return (
    <div
      className="note-content note-content-clickable"
      onClick={openNote}
      onPointerEnter={() => router.prefetch(href)}
    >
      <SafeMarkdown source={source} />
    </div>
  )
}

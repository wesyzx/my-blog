import Image from 'next/image'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ShelfItem, ShelfKind } from '@/lib/shelf'
import styles from './Shelf.module.css'

interface ShelfMediaProps {
  items: ShelfItem[]
  kind: Exclude<ShelfKind, 'book'>
  label: string
  onOpen: (item: ShelfItem) => void
}

interface MouseDrag {
  id: number
  startX: number
  startScroll: number
  moved: boolean
}

function cardStep(track: HTMLDivElement) {
  const [first, second] = track.children
  return first && second ? second.getBoundingClientRect().left - first.getBoundingClientRect().left : 0
}

export default function ShelfMedia({ items, kind, label, onOpen }: ShelfMediaProps) {
  const drag = useRef<MouseDrag | null>(null)
  const suppressClick = useRef(false)
  const [centered, setCentered] = useState(0)
  const isAlbum = kind === 'music'

  function centerCard(track: HTMLDivElement, index: number) {
    const target = Math.max(0, Math.min(index, items.length - 1))
    track.scrollTo({
      left: target * cardStep(track),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (items.length < 2) return
    const track = event.currentTarget
    const index = Math.round(track.scrollLeft / cardStep(track))
    const target = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: items.length - 1,
    }[event.key]
    if (target === undefined) return
    event.preventDefault()
    centerCard(track, target)
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false
    if (event.pointerType !== 'mouse' || event.button !== 0 || items.length < 2) return
    drag.current = {
      id: event.pointerId,
      startX: event.clientX,
      startScroll: event.currentTarget.scrollLeft,
      moved: false,
    }
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    const delta = event.clientX - current.startX
    const track = event.currentTarget
    if (!current.moved) {
      if (Math.abs(delta) < 6) return
      current.moved = true
      track.setPointerCapture(event.pointerId)
      track.dataset.dragging = 'true'
      suppressClick.current = true
    }
    track.scrollLeft = current.startScroll - delta
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    drag.current = null
    if (!current.moved) return
    const track = event.currentTarget
    const index = Math.round(track.scrollLeft / cardStep(track))
    delete track.dataset.dragging
    centerCard(track, index)
  }

  if (!items.length) return <div className={styles.empty}>这个分类还没有条目。</div>

  return (
    <div className={`${styles.mediaStage} ${isAlbum ? styles.mediaAlbums : styles.mediaPosters}`}>
      <div
        className={styles.mediaTrack}
        role="region"
        aria-label={`${label}陈列`}
        tabIndex={items.length > 1 ? 0 : undefined}
        data-scrollable={items.length > 1}
        onScroll={(event) => {
          const track = event.currentTarget
          const step = cardStep(track)
          if (step) setCentered(Math.round(track.scrollLeft / step))
        }}
        onKeyDown={handleKeyDown}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onPointerLeave={() => {
          if (!drag.current?.moved) drag.current = null
        }}
        onClickCapture={(event) => {
          if (!suppressClick.current || event.detail === 0) return
          suppressClick.current = false
          event.stopPropagation()
        }}
      >
        {items.map((item, index) => {
          const subtitle = isAlbum ? item.creator : item.seasonNumber ? `第 ${item.seasonNumber} 季` : ''
          return (
            <button
              className={styles.mediaItem}
              key={item.id}
              type="button"
              aria-current={index === centered || undefined}
              onClick={() => onOpen(item)}
            >
              <span className={styles.mediaCover}>
                {item.cover && (
                  <Image
                    src={item.cover}
                    alt=""
                    fill
                    sizes={isAlbum ? '(max-width: 720px) min(68vw, 280px), 246px' : '(max-width: 520px) 68vw, 310px'}
                    draggable={false}
                    onError={(event) => { event.currentTarget.hidden = true }}
                  />
                )}
              </span>
              <span className={styles.mediaTitle}>{item.title}</span>
              {subtitle && <span className={styles.mediaSubtitle}>{subtitle}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

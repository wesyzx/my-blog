'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ShelfItem } from '@/lib/shelf'
import styles from './Shelf.module.css'

interface ShelfStageProps {
  items: ShelfItem[]
  onOpen: (item: ShelfItem) => void
}

interface PointerState {
  id: number
  startX: number
  startY: number
  startTarget: number
  lastX: number
  lastT: number
  velocity: number
  moved: boolean
}

function centerIndex(length: number) {
  return Math.max(0, Math.floor((length - 1) / 2))
}

const HEIGHT_SCALE = [1, 0.945, 1.025, 0.975, 1.01, 0.925, 1.035, 0.96]

function bookHeight(height: number, index: number) {
  return Math.round(height * HEIGHT_SCALE[index % HEIGHT_SCALE.length])
}

export default function ShelfStage({ items, onOpen }: ShelfStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const tapeRefs = useRef<Array<HTMLDivElement | null>>([])
  const spineRefs = useRef<Array<HTMLDivElement | null>>([])
  const coverRefs = useRef<Array<HTMLDivElement | null>>([])
  const positionRef = useRef(centerIndex(items.length))
  const targetRef = useRef(centerIndex(items.length))
  const draggingRef = useRef(false)
  const pointerRef = useRef<PointerState | null>(null)
  const suppressClickRef = useRef(false)
  const hoverTimerRef = useRef<number | null>(null)
  const wheelTimerRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)
  const lastCenteredRef = useRef(centerIndex(items.length))
  const readyRef = useRef(false)
  const tiltRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const [size, setSize] = useState({ height: 260, spine: 38, depth: 172, gap: 7 })
  const [centeredIndex, setCenteredIndex] = useState(centerIndex(items.length))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const next = centerIndex(items.length)
    positionRef.current = next
    targetRef.current = next
    lastCenteredRef.current = -1
  }, [items.length])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const measure = () => {
      const width = viewport.clientWidth
      const boxHeight = viewport.clientHeight
      if (!width) return
      const mobile = width < 640
      const widthCap = width * (mobile ? 0.58 : 0.62)
      const heightCap = boxHeight > 0 ? boxHeight * 0.68 : Number.POSITIVE_INFINITY
      const height = Math.round(
        Math.max(mobile ? 170 : 220, Math.min(widthCap, heightCap, mobile ? 340 : 470)),
      )
      const spine = Math.round(height * (mobile ? 0.13 : 0.14))
      const depth = Math.round(height * 0.66)
      const gap = Math.round(height * 0.028)
      setSize((current) => (
        current.height === height && current.spine === spine && current.depth === depth && current.gap === gap
          ? current
          : { height, spine, depth, gap }
      ))
    }

    measure()
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(viewport)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      reducedMotionRef.current = media.matches
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const clampTarget = useCallback((value: number) => (
    Math.max(0, Math.min(items.length - 1, value))
  ), [items.length])

  const updateTilt = useCallback((clientX: number, clientY: number) => {
    const viewport = viewportRef.current
    if (!viewport || reducedMotionRef.current) return
    const rect = viewport.getBoundingClientRect()
    const dx = clientX - (rect.left + rect.width / 2)
    const dy = clientY - (rect.top + rect.height / 2)
    const tilt = tiltRef.current
    const inside = Math.abs(dx) < Math.min(rect.width * 0.44, size.depth) && Math.abs(dy) < size.height * 0.62
    if (!inside) {
      tilt.targetX = 0
      tilt.targetY = 0
      return
    }
    tilt.targetY = Math.max(-9, Math.min(9, (dx / (size.depth * 0.55)) * 9))
    tilt.targetX = Math.max(-6, Math.min(6, -(dy / (size.height / 2)) * 6))
  }, [size.depth, size.height])

  const activateBook = useCallback((index: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (Math.abs(index - positionRef.current) > 0.5) {
      targetRef.current = index
      return
    }
    const item = items[index]
    if (item) onOpen(item)
  }, [items, onOpen])

  useEffect(() => {
    let frame = 0
    let last = performance.now()

    const updateBooks = () => {
      const count = items.length
      const position = positionRef.current
      const { height, spine, depth, gap } = size
      const tilt = tiltRef.current
      const tiltX = tilt.x
      const tiltY = tilt.y

      for (let index = 0; index < count; index += 1) {
        const tape = tapeRefs.current[index]
        const spineNode = spineRefs.current[index]
        const coverNode = coverRefs.current[index]
        if (!tape || !spineNode || !coverNode) continue

        const bh = bookHeight(height, index)
        const offset = index - position
        const distance = Math.abs(offset)
        const raw = Math.max(0, 1 - distance)
        const smooth = raw * raw * (3 - 2 * raw)
        const arc = distance < 1
          ? (offset + Math.sin(Math.PI * offset) / Math.PI) / 2
          : 0.5 * Math.sign(offset)
        const x = offset * (spine + gap) + (depth - spine + 1.6 * gap) * arc
        const yaw = -90 * smooth + tiltY * smooth
        const y = -0.025 * smooth * height - 0.045 * tiltX * height + (height - bh) / 2
        const z = 0.2 * smooth * height

        tape.style.transform = `perspective(2200px) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateZ(${(-4.5 * smooth).toFixed(2)}deg) rotateX(${(tiltX * smooth).toFixed(2)}deg) rotateY(${yaw.toFixed(2)}deg)`
        tape.style.zIndex = String(Math.round(100 - 4 * distance))
        spineNode.style.visibility = Math.abs(yaw) > 88 ? 'hidden' : ''
        coverNode.style.visibility = Math.abs(yaw + 90) > 88 ? 'hidden' : ''
        spineNode.style.setProperty('--shade', (0.55 * smooth).toFixed(3))
        coverNode.style.setProperty('--shade', ((1 - smooth) * 0.5).toFixed(3))
      }

      const nextCentered = Math.max(0, Math.min(count - 1, Math.round(position)))
      if (nextCentered !== lastCenteredRef.current) {
        lastCenteredRef.current = nextCentered
        setCenteredIndex(nextCentered)
      }
      if (!readyRef.current) {
        readyRef.current = true
        setReady(true)
      }
    }

    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000)
      last = now
      const target = targetRef.current
      if (reducedMotionRef.current) {
        positionRef.current = target
      } else {
        const speed = draggingRef.current ? 18 : 5.2
        positionRef.current += (target - positionRef.current) * (1 - Math.exp(-speed * delta))
        if (Math.abs(target - positionRef.current) < 0.0001) positionRef.current = target
      }

      const tilt = tiltRef.current
      const ease = 1 - Math.exp(-7 * delta)
      tilt.x += (tilt.targetX - tilt.x) * ease
      tilt.y += (tilt.targetY - tilt.y) * ease
      updateBooks()
      frame = window.requestAnimationFrame(tick)
    }

    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [items.length, size])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      event.preventDefault()
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1
      targetRef.current = Math.max(0, Math.min(items.length - 1, targetRef.current + delta * unit * 0.004))
      if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = window.setTimeout(() => {
        targetRef.current = Math.round(targetRef.current)
      }, 140)
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', onWheel)
      if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current)
    }
  }, [items.length])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('a,button')) return
    const viewport = viewportRef.current
    if (!viewport) return
    suppressClickRef.current = false
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTarget: targetRef.current,
      lastX: event.clientX,
      lastT: performance.now(),
      velocity: 0,
      moved: false,
    }
    draggingRef.current = false
    clearHoverTimer()
    try {
      viewport.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture is a progressive enhancement.
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    updateTilt(event.clientX, event.clientY)
    const state = pointerRef.current
    if (!state) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    const now = performance.now()
    state.velocity = (event.clientX - state.lastX) / Math.max(1, now - state.lastT)
    state.lastX = event.clientX
    state.lastT = now

    if (!draggingRef.current && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      draggingRef.current = true
      state.moved = true
    }
    if (!draggingRef.current) return
    targetRef.current = clampTarget(state.startTarget - dx / (size.spine + size.gap))
  }

  const finishPointer = (event: ReactPointerEvent<HTMLDivElement>, applyVelocity: boolean) => {
    const state = pointerRef.current
    const viewport = viewportRef.current
    if (!state) return
    if (draggingRef.current) {
      const next = applyVelocity
        ? Math.round(targetRef.current - 3.2 * state.velocity)
        : Math.round(targetRef.current)
      targetRef.current = clampTarget(next)
    }
    suppressClickRef.current = draggingRef.current
    if (draggingRef.current) {
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 320)
    }
    pointerRef.current = null
    draggingRef.current = false
    if (viewport) {
      try {
        viewport.releasePointerCapture(event.pointerId)
      } catch {
        // Ignore a pointer that was already released.
      }
    }
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    finishPointer(event, true)
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    finishPointer(event, false)
  }

  const handlePointerLeave = () => {
    clearHoverTimer()
    const tilt = tiltRef.current
    tilt.targetX = 0
    tilt.targetY = 0
  }

  const handleHover = (index: number) => {
    if (draggingRef.current) return
    clearHoverTimer()
    hoverTimerRef.current = window.setTimeout(() => {
      if (!draggingRef.current) targetRef.current = index
    }, 90)
  }

  const handleViewportClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    const { clientX, clientY } = event
    const position = positionRef.current
    let hitIndex: number | null = null
    let hitDistance = Infinity

    for (let index = 0; index < items.length; index += 1) {
      const nodes = [coverRefs.current[index], spineRefs.current[index]]
      const contains = nodes.some((node) => {
        if (!node || node.style.visibility === 'hidden') return false
        const rect = node.getBoundingClientRect()
        return rect.width > 0 &&
          clientX >= rect.left && clientX <= rect.right &&
          clientY >= rect.top && clientY <= rect.bottom
      })
      if (!contains) continue
      const distance = Math.abs(index - position)
      if (distance < hitDistance) {
        hitDistance = distance
        hitIndex = index
      }
    }

    if (hitIndex === null) return
    activateBook(hitIndex)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      targetRef.current = clampTarget(Math.round(targetRef.current) - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      targetRef.current = clampTarget(Math.round(targetRef.current) + 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      targetRef.current = 0
    } else if (event.key === 'End') {
      event.preventDefault()
      targetRef.current = Math.max(0, items.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const item = items[Math.round(positionRef.current)]
      if (item) onOpen(item)
    }
  }

  if (!items.length) {
    return <div className={styles.empty}>这个分类还没有条目。</div>
  }

  return (
    <div className={styles.stageCard} style={{ '--shelf-h': `${size.height}px` } as CSSProperties}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        role="region"
        aria-label="书影音书架：拖拽、滚轮或方向键浏览，点击封面查看详情"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onClick={handleViewportClick}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.floor} aria-hidden="true" />
        <div className={`${styles.stage}${ready ? ` ${styles.stageReady}` : ''}`}>
          {items.map((item, index) => (
            <div
              key={item.id}
              ref={(node) => { tapeRefs.current[index] = node }}
              className={styles.book}
              style={{
                '--bg': item.colors.bg,
                '--fg': item.colors.fg,
                '--band': item.colors.band,
                '--band-fg': item.colors.bandFg,
              } as CSSProperties}
              role="button"
              tabIndex={0}
              aria-label={`${item.title}，${item.creator}${index === centeredIndex ? '，当前居中' : ''}`}
              aria-current={index === centeredIndex ? 'true' : undefined}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  activateBook(index)
                }
              }}
            >
              <div
                ref={(node) => { spineRefs.current[index] = node }}
                className={`${styles.face} ${styles.spine}`}
                style={{
                  '--ws': `${size.spine}px`,
                  '--dd': `${Math.round(size.depth * (item.aspect / (2 / 3)))}px`,
                  '--h': `${bookHeight(size.height, index)}px`,
                } as CSSProperties}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') handleHover(index)
                }}
                onPointerLeave={clearHoverTimer}
              >
                <span className={styles.band}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.spineTitle}>{item.title}</span>
                <span className={styles.spineAuthor}>{item.creator}</span>
              </div>
              <div
                ref={(node) => { coverRefs.current[index] = node }}
                className={`${styles.face} ${styles.cover}`}
                style={{
                  '--ws': `${size.spine}px`,
                  '--dd': `${Math.round(size.depth * (item.aspect / (2 / 3)))}px`,
                  '--h': `${bookHeight(size.height, index)}px`,
                  backgroundImage: `url("${item.cover}")`,
                } as CSSProperties}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') handleHover(index)
                }}
                onPointerLeave={clearHoverTimer}
              />
            </div>
          ))}
        </div>
      </div>
      <p className={styles.srOnly} aria-live="polite">
        当前居中：{items[centeredIndex]?.title ?? ''}
      </p>
    </div>
  )
}

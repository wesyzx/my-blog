'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { ShelfItem } from '@/lib/shelf'
import styles from './Shelf.module.css'

interface ShelfDetailProps {
  item: ShelfItem | null
  onClose: () => void
}

const STATUS_LABEL: Record<ShelfItem['status'], string> = {
  done: '已看完',
  doing: '进行中',
  mark: '想看的',
}

export default function ShelfDetail({ item, onClose }: ShelfDetailProps) {
  const detailRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!item) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !detailRef.current) return
      const focusable = Array.from(detailRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [item, onClose])

  if (!item) return null

  return createPortal(
    <div
      className={styles.detailBackdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={detailRef}
        className={styles.detail}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shelf-detail-title"
        style={{ borderTop: `3px solid ${item.colors.band}` }}
      >
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="关闭详情">
          ×
        </button>
        <Image
          className={styles.detailCover}
          src={item.cover}
          alt={`${item.title} 封面`}
          width={600}
          height={900}
          sizes="220px"
          priority
        />
        <div className={styles.detailBody}>
          <div className={styles.detailEyebrow}>
            {item.kind === 'book' ? '书籍' : '电影'} · 豆瓣条目
          </div>
          <h2 id="shelf-detail-title" className={styles.detailTitle}>{item.title}</h2>
          <p className={styles.detailCreator}>{item.creator}</p>
          <div className={styles.detailMeta}>
            <span>{item.year || '年份未知'}</span>
            {item.pages ? <span>{item.pages} 页</span> : null}
            {item.minutes ? <span>{item.minutes} 分钟</span> : null}
            {item.date ? <span>标记于 {item.date}</span> : null}
          </div>
          <div className={styles.ratingRow}>
            <div className={styles.rating}>
              <span className={styles.ratingLabel}>豆瓣评分</span>
              <span className={styles.ratingValue}>{item.doubanRating ?? '—'}</span>
            </div>
            {item.myRating ? (
              <div className={styles.rating}>
                <span className={styles.ratingLabel}>我的评分</span>
                <span className={styles.ratingValue}>{item.myRating}</span>
              </div>
            ) : null}
            <div className={styles.rating}>
              <span className={styles.ratingLabel}>评价人数</span>
              <span className={styles.ratingValue}>{item.ratingCount.toLocaleString('zh-CN')}</span>
            </div>
          </div>
          {item.summary ? <p className={styles.summary}>{item.summary}</p> : null}
          {item.comment ? <p className={styles.comment}>“{item.comment}”</p> : null}
          <div className={styles.detailFooter}>
            <a className={styles.detailLink} href={item.url} target="_blank" rel="noreferrer">
              在豆瓣查看 <span aria-hidden="true">↗</span>
            </a>
            <span className={styles.statusPill}>{STATUS_LABEL[item.status]}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

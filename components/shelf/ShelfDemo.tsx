'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ShelfItem } from '@/lib/shelf'
import ShelfDetail from './ShelfDetail'
import ShelfStage from './ShelfStage'
import styles from './ShelfDemo.module.css'

type Filter = 'all' | 'book' | 'movie'

interface ShelfDemoProps {
  items: ShelfItem[]
  syncedAt: string
}

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'book', label: '书籍' },
  { value: 'movie', label: '电影' },
]

export default function ShelfDemo({ items, syncedAt }: ShelfDemoProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [activeItem, setActiveItem] = useState<ShelfItem | null>(null)

  const filtered = useMemo(() => (
    filter === 'all' ? items : items.filter((item) => item.kind === filter)
  ), [filter, items])

  const closeDetail = useCallback(() => setActiveItem(null), [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>Books &amp; Films · Local Demo</div>
        <h1 className={styles.title}>书影音</h1>
        <p className={styles.lede}>
          把看过的书和电影放上一排书架。拖动、滚轮或方向键换书，
          中间那本会从书脊转成正封面，点开就能看到评分和简介。
        </p>
        <div className={styles.metaLine}>
          <span>{items.length} 条公开条目</span>
          <span className={styles.dot} aria-hidden="true" />
          <span>封面与配色来自豆瓣</span>
          <span className={styles.dot} aria-hidden="true" />
          <span>同步于 {syncedAt.slice(0, 10)}</span>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="筛选书影音">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.filter}${filter === option.value ? ` ${styles.filterActive}` : ''}`}
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className={styles.count}>{filtered.length} 件</div>
      </div>

      <ShelfStage key={filter} items={filtered} onOpen={setActiveItem} />

      <p className={styles.sourceNote}>
        这是一个本地视觉 demo，数据取自豆瓣公开条目；正式页面可以换成你自己的收藏。
        封面版权归原出版方或豆瓣用户所有，仅用于个人展示。
      </p>

      <ShelfDetail item={activeItem} onClose={closeDetail} />
    </div>
  )
}

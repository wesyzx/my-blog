'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ShelfItem } from '@/lib/shelf'
import PageHeader from '../PageHeader'
import ShelfDetail from './ShelfDetail'
import ShelfStage from './ShelfStage'
import styles from './Shelf.module.css'

type Filter = 'all' | 'book' | 'movie'

interface ShelfViewProps {
  items: ShelfItem[]
}

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'book', label: '书籍' },
  { value: 'movie', label: '电影' },
]

export default function ShelfView({ items }: ShelfViewProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [activeItem, setActiveItem] = useState<ShelfItem | null>(null)

  const filtered = useMemo(() => (
    filter === 'all' ? items : items.filter((item) => item.kind === filter)
  ), [filter, items])

  const closeDetail = useCallback(() => setActiveItem(null), [])

  return (
    <div className="page-shell shelf-page animate-fade-up">
      <PageHeader
        title="书影音"
        className="shelf-page-header"
        actions={(
          <div className={styles.controls}>
            <nav className="category-filter" aria-label="筛选书影音">
              <div className="category-links">
                {FILTERS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={filter === option.value ? 'active' : ''}
                    onClick={() => setFilter(option.value)}
                    aria-pressed={filter === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </nav>
            <span className={styles.count}>{filtered.length} 件</span>
          </div>
        )}
      />

      <ShelfStage key={filter} items={filtered} onOpen={setActiveItem} />

      <ShelfDetail item={activeItem} onClose={closeDetail} />
    </div>
  )
}

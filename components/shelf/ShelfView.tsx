'use client'

import { useCallback, useMemo, useState } from 'react'
import type { ShelfItem, ShelfKind } from '@/lib/shelf'
import PageHeader from '../PageHeader'
import ShelfDetail from './ShelfDetail'
import ShelfMedia from './ShelfMedia'
import ShelfStage from './ShelfStage'
import styles from './Shelf.module.css'

type Filter = ShelfKind

interface ShelfViewProps {
  items: ShelfItem[]
}

const KINDS: Array<{ value: ShelfKind; label: string; unit: string }> = [
  { value: 'book', label: '书籍', unit: '本' },
  { value: 'movie', label: '电影', unit: '部' },
  { value: 'tv', label: '剧集', unit: '部' },
  { value: 'music', label: '音乐', unit: '张' },
]

export default function ShelfView({ items }: ShelfViewProps) {
  const [filter, setFilter] = useState<Filter>('book')
  const [activeItem, setActiveItem] = useState<ShelfItem | null>(null)

  const filtered = useMemo(() => items.filter((item) => item.kind === filter), [filter, items])

  const counts = useMemo(() => {
    const next: Record<ShelfKind, number> = { book: 0, movie: 0, tv: 0, music: 0 }
    for (const item of items) next[item.kind] += 1
    return next
  }, [items])

  const active = KINDS.find((kind) => kind.value === filter) ?? KINDS[0]
  const summary = `${counts[active.value]} ${active.unit}`

  const closeDetail = useCallback(() => setActiveItem(null), [])

  return (
    <div className={`page-shell ${styles.page}${filter === 'music' ? ` ${styles.albumPage}` : ''} animate-fade-up`}>
      <PageHeader
        title="书影音"
        className="shelf-page-header"
        actions={(
          <nav className="category-filter" aria-label="筛选书影音">
            <div className="category-links">
              {KINDS.map((option) => (
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
        )}
      />

      <p className={styles.meta}>{summary}</p>

      {filter === 'book' ? (
        <ShelfStage items={filtered} onOpen={setActiveItem} />
      ) : (
        <ShelfMedia key={filter} kind={filter} label={active.label} items={filtered} onOpen={setActiveItem} />
      )}

      <ShelfDetail item={activeItem} onClose={closeDetail} />
    </div>
  )
}

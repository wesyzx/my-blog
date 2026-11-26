import shelfData from '@/content/shelf.json'

export type ShelfKind = 'book' | 'movie'
export type ShelfStatus = 'done' | 'doing' | 'mark'

export interface ShelfColors {
  bg: string
  fg: string
  band: string
  bandFg: string
  paper: string
  paperFg: string
  isDark: boolean
}

export interface ShelfItem {
  id: string
  kind: ShelfKind
  title: string
  creator: string
  year: string
  cover: string
  coverSource?: string
  aspect: number
  colors: ShelfColors
  doubanRating: number | null
  ratingCount: number
  summary: string
  url: string
  pages: number | null
  minutes: number | null
  myRating: number | null
  comment: string
  status: ShelfStatus
  date: string
}

export interface ShelfData {
  syncedAt: string
  source: string
  items: ShelfItem[]
}

const shelf = shelfData as ShelfData

export function getShelfData(): ShelfData {
  return shelf
}

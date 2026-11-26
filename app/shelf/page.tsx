import ShelfView from '@/components/shelf/ShelfView'
import { createPageMetadata } from '@/lib/metadata'
import { getShelfData } from '@/lib/shelf'

export const metadata = createPageMetadata({
  title: '书影音',
  description: '把看过的书和电影放上一排书架：拖动浏览，点开封面看评分和简介。',
  path: '/shelf',
})

export default function ShelfPage() {
  const data = getShelfData()

  return <ShelfView items={data.items} />
}

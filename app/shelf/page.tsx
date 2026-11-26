import ShelfView from '@/components/shelf/ShelfView'
import { createPageMetadata } from '@/lib/metadata'
import { getShelfData } from '@/lib/shelf'

export const metadata = createPageMetadata({
  title: '书影音',
  description: '把读过的书、看过的电影剧集和听过的音乐放上一排书架：拖动浏览，点开封面看评分和简介。',
  path: '/shelf',
})

export default function ShelfPage() {
  const data = getShelfData()

  return <ShelfView items={data.items} />
}

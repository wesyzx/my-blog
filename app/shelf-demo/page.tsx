import ShelfDemo from '@/components/shelf/ShelfDemo'
import { createPageMetadata } from '@/lib/metadata'
import { getShelfDemoData } from '@/lib/shelf'

export const metadata = createPageMetadata({
  title: '书影音 Demo',
  description: '一个本地书影音书架 demo：书脊旋转、拖拽浏览、详情展开。',
  path: '/shelf-demo',
  noIndex: true,
})

export default function ShelfDemoPage() {
  const data = getShelfDemoData()

  return <ShelfDemo items={data.items} syncedAt={data.syncedAt} />
}

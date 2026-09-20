import { getAllGalleryItems } from '@/lib/gallery'
import { createPageMetadata } from '@/lib/metadata'
import GalleryList from '@/components/GalleryList'

export const metadata = createPageMetadata({
  title: '相册',
  description: '随着快门的开启，时间被凝固下来，作为「此时此刻」的记录是不可重复的，也就成为永远。',
  path: '/gallery',
})

// 相册列表跟着内容源走，必须每次请求重新渲染 —— 静态页的响应头会被 EdgeOne 缓存住，
// 删掉的相册还会继续挂在列表上（原因详见 app/say/page.tsx 里的说明）。
export const dynamic = 'force-dynamic'

export default function GalleryPage() {
  const albums = getAllGalleryItems()

  return <GalleryList albums={albums} />
}

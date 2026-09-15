import { getAllGalleryItems } from '@/lib/gallery'
import GalleryList from '@/components/GalleryList'

export const metadata = {
  title: '相册',
  description: '随着快门的开启，时间被凝固下来，作为「此时此刻」的记录是不可重复的，也就成为永远。',
}

export default function GalleryPage() {
  const albums = getAllGalleryItems()

  return <GalleryList albums={albums} />
}

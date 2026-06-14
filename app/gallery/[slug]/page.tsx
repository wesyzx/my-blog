import { getGalleryBySlug, getAllGalleryItems } from '@/lib/gallery'
import { notFound } from 'next/navigation'
import GalleryDetail from '@/components/GalleryDetail'

export async function generateStaticParams() {
  const items = getAllGalleryItems()
  return items.map((item) => ({ slug: item.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const item = getGalleryBySlug(slug)
  if (!item) return {}
  return { title: `${item.title} - 相册` }
}

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const album = getGalleryBySlug(slug)
  if (!album) notFound()

  return <GalleryDetail album={album} />
}

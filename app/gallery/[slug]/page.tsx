import { getGalleryBySlug, getAllGalleryItems } from '@/lib/gallery'
import { notFound, permanentRedirect } from 'next/navigation'
import GalleryDetail from '@/components/GalleryDetail'
import { createPageMetadata } from '@/lib/metadata'

export async function generateStaticParams() {
  const items = getAllGalleryItems()
  return items.flatMap((item) => [item.slug, ...(item.aliases || [])].map((slug) => ({ slug })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const item = getGalleryBySlug(slug)
  if (!item) return {}
  return createPageMetadata({
    title: `${item.title} - 相册`,
    description: item.excerpt || `${item.title}相册`,
    path: `/gallery/${encodeURIComponent(item.slug)}`,
    images: item.cover ? [item.cover] : item.images.slice(0, 1).map((image) => image.src),
  })
}

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const album = getGalleryBySlug(slug)
  if (!album) notFound()
  if (decodeURIComponent(slug) !== album.slug) permanentRedirect(`/gallery/${encodeURIComponent(album.slug)}`)

  return <GalleryDetail album={album} />
}

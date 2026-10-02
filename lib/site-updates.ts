import 'server-only'
import { getAllPosts } from '@/lib/posts'
import { getAllFoodPosts } from '@/lib/food'
import { getAllGalleryItems, type GalleryMeta } from '@/lib/gallery'
import { getAllSays, getSaySummary } from '@/lib/say'

export interface SiteUpdate {
  id: string
  kind: 'post' | 'say' | 'gallery' | 'food'
  title: string
  detail?: string
  cover?: string
  date: string
  href: string
  album?: GalleryMeta
}

function dateValue(value: string) {
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

export async function getAllSiteUpdates(): Promise<SiteUpdate[]> {
  const posts = getAllPosts()
  const gallery = getAllGalleryItems()
  const [food, says] = await Promise.all([getAllFoodPosts(), getAllSays()])

  return [
    ...posts.map((post): SiteUpdate => ({
      id: `post-${post.slug}`,
      kind: 'post',
      title: post.title,
      detail: post.excerpt || post.category,
      cover: post.cover || undefined,
      date: post.date,
      href: `/posts/${encodeURIComponent(post.slug)}`,
    })),
    ...says.map((say): SiteUpdate => ({
      id: `say-${say.slug}`,
      kind: 'say',
      title: getSaySummary(say.content),
      cover: say.images?.[0] || say.image,
      date: say.date,
      href: `/say/${encodeURIComponent(say.slug)}`,
    })),
    ...gallery.map((album): SiteUpdate => ({
      id: `gallery-${album.slug}`,
      kind: 'gallery',
      title: album.title,
      date: album.date,
      href: `/gallery/${encodeURIComponent(album.slug)}`,
      album,
    })),
    ...food.map((place): SiteUpdate => ({
      id: `food-${place.slug}`,
      kind: 'food',
      title: place.title,
      detail: place.address || place.location,
      cover: place.cover || undefined,
      date: place.date,
      href: `/food/${encodeURIComponent(place.slug)}`,
    })),
  ].sort((a, b) => dateValue(b.date) - dateValue(a.date))
}

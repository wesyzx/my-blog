import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/posts'
import { getAllFoodPosts } from '@/lib/food'
import { getAllGalleryItems } from '@/lib/gallery'

const base = 'https://guanyan.me'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [food, gallery] = await Promise.all([getAllFoodPosts(), getAllGalleryItems()])
  const staticPages = ['', '/say', '/food', '/gallery', '/message', '/about'].map((path) => ({ url: `${base}${path}`, changeFrequency: 'weekly' as const }))
  const posts = getAllPosts().map((post) => ({ url: `${base}/posts/${encodeURIComponent(post.slug)}`, lastModified: post.date }))
  const foodPages = food.map((post) => ({ url: `${base}/food/${encodeURIComponent(post.slug)}`, lastModified: post.date }))
  const galleryPages = gallery.map((album) => ({ url: `${base}/gallery/${encodeURIComponent(album.slug)}`, lastModified: album.date }))
  return [...staticPages, ...posts, ...foodPages, ...galleryPages]
}

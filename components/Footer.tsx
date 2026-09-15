import Link from 'next/link'
import RunningTime from './RunningTime'
import VisitorStats from './VisitorStats'
import { getAllPosts } from '@/lib/posts'
import { getAllFoodPosts } from '@/lib/food'
import { getAllGalleryItems } from '@/lib/gallery'

export default async function Footer() {
  const food = await getAllFoodPosts()
  const pageKeys = [
    '/', '/about', '/food', '/gallery', '/message', '/say',
    ...getAllPosts().map((post) => `/posts/${post.slug}`),
    ...food.map((post) => `/food/${post.slug}`),
    ...getAllGalleryItems().map((album) => `/gallery/${album.slug}`),
  ]
  return <footer className="site-footer"><div className="site-footer-inner">
    <div className="footer-stats"><RunningTime /><VisitorStats pageKeys={pageKeys} /></div>
    <div className="footer-meta"><span>© 2016–{new Date().getFullYear()} 轨道之外</span><span className="footer-links"><Link href="https://nextjs.org" target="_blank" rel="noopener noreferrer">Next.js</Link><span aria-hidden="true">·</span><Link href="https://edgeone.ai" target="_blank" rel="noopener noreferrer">EdgeOne</Link><span aria-hidden="true">·</span><Link href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer">Cloudflare</Link><span aria-hidden="true">·</span><Link href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备16031853号-1</Link></span></div>
  </div></footer>
}

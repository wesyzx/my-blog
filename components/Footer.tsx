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
    <div className="footer-meta"><span>© 2016–{new Date().getFullYear()} 轨道之外</span><span className="footer-links"><Link href="https://nextjs.org" target="_blank">Next.js</Link><span>·</span><span>EdgeOne</span><span>·</span><Link href="https://beian.miit.gov.cn/" target="_blank">浙ICP备16031853号-1</Link></span></div>
  </div></footer>
}

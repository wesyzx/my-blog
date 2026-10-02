import Link from 'next/link'
import RunningTime from './RunningTime'
import VisitorStats from './VisitorStats'
import { getAllPosts } from '@/lib/posts'
import { getAllFoodPosts } from '@/lib/food'
import { getAllGalleryItems } from '@/lib/gallery'

type BrandIconProps = {
  brand: 'next' | 'edgeone' | 'cloudflare'
}

function BrandIcon({ brand }: BrandIconProps) {
  if (brand === 'next') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 16V8l8 10V8" />
        <path d="m15.2 8 3.4 4.6" />
      </svg>
    )
  }

  if (brand === 'edgeone') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M7 8.2h10M7 12h7.2M7 15.8h10" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.4 17.5h10.8a3.3 3.3 0 0 0 .4-6.6A5.9 5.9 0 0 0 7.5 9.7a4 4 0 0 0-.1 7.8Z" />
      <path d="M3.5 17.5h2.2" />
    </svg>
  )
}

export default async function Footer() {
  const food = await getAllFoodPosts()
  const pageKeys = [
    '/', '/posts', '/about', '/archive', '/food', '/gallery', '/workouts', '/message', '/say',
    ...getAllPosts().map((post) => `/posts/${post.slug}`),
    ...food.map((post) => `/food/${post.slug}`),
    ...getAllGalleryItems().map((album) => `/gallery/${album.slug}`),
  ]

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-powered" aria-label="网站技术支持">
          <span className="footer-powered-label">BUILT WITH</span>
          <div className="footer-tech-list">
            <Link href="https://nextjs.org/" target="_blank" rel="noopener noreferrer" className="footer-tech footer-tech-next">
              <BrandIcon brand="next" />
              <span>Next.js</span>
            </Link>
            <Link href="https://edgeone.ai/" target="_blank" rel="noopener noreferrer" className="footer-tech footer-tech-edgeone">
              <BrandIcon brand="edgeone" />
              <span>EdgeOne</span>
            </Link>
            <Link href="https://www.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="footer-tech footer-tech-cloudflare">
              <BrandIcon brand="cloudflare" />
              <span>Cloudflare</span>
            </Link>
          </div>
        </div>
        <nav className="footer-links" aria-label="页脚导航">
          <Link href="https://github.com/wesyzx" target="_blank" rel="noopener noreferrer">GitHub</Link>
          <span aria-hidden="true">·</span>
          <Link href="/rss.xml">RSS</Link>
        </nav>
        <div className="footer-stats" aria-label="站点运行状态">
          <RunningTime />
          <span aria-hidden="true">·</span>
          <VisitorStats pageKeys={pageKeys} />
        </div>
        <div className="footer-copyright">
          <Link href="/">© 2016–{new Date().getFullYear()} 轨道之外</Link>
          <span aria-hidden="true">·</span>
          <Link href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备16031853号-1</Link>
        </div>
      </div>
    </footer>
  )
}

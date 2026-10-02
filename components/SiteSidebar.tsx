'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'
import { SITE_NAV_ITEMS } from './siteNavigation'

/**
 * 侧栏品牌图：作者头像（对齐 ueno 的 .side_logo，120px 方形）。
 *
 * 两个注意点：
 *  1. 原图是 2.9MB 的 PNG，必须带七牛缩图参数，否则侧栏要拖一张近 3MB 的图。
 *  2. 加 `unoptimized`：这里已经用 imageMogr2 缩到 240px 了，
 *     再走一遍 Next 的图片优化器没有收益，也少一层远程抓取。
 */
const AUTHOR_AVATAR = 'https://img.guanyan.me/2026/05/fa7d85a90137299c295a3cdbe9790395.png?imageMogr2/thumbnail/240x/quality/80/format/webp'

export default function SiteSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <aside className="site-sidebar" aria-label="站点导航">
      <div className="sidebar-inner">
        <Link href="/" className="sidebar-brand" aria-label="轨道之外首页">
          <span className="sidebar-logo">
            <Image src={AUTHOR_AVATAR} alt="" width={120} height={120} className="sidebar-avatar" unoptimized fetchPriority="high" />
          </span>
          <span className="sidebar-title">轨道之外</span>
          <span className="sidebar-desc">把日子写下来，等它们慢慢发光。</span>
        </Link>

        <nav className="sidebar-nav">
          <div className="sidebar-links">
            {SITE_NAV_ITEMS.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? 'active' : ''}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="sidebar-foot">
          <p className="sidebar-verse">苔花如米小<br />也学牡丹开</p>
        </div>
      </div>
    </aside>
  )
}

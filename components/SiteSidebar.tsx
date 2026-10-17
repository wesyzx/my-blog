'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AUTHOR_AVATAR } from '@/lib/site-branding'
import Icon from './Icon'
import { SITE_NAV_ITEMS } from './siteNavigation'

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
          <span className="sidebar-desc">按部就班的我，脱轨了，那就把离开的日子，一一收好。</span>
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

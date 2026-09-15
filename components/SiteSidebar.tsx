'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon, { type IconName } from './Icon'

const groups: Array<{ label: string; items: Array<{ label: string; href: string; icon: IconName }> }> = [
  {
    label: '抽屉',
    items: [
      { label: '博文', href: '/', icon: 'post' },
      { label: '说说', href: '/say', icon: 'say' },
      { label: '关于', href: '/about', icon: 'about' },
    ],
  },
  {
    label: '途中',
    items: [
      { label: '美食', href: '/food', icon: 'food' },
      { label: '相册', href: '/gallery', icon: 'gallery' },
    ],
  },
  {
    label: '交流',
    items: [
      { label: '留言', href: '/message', icon: 'message' },
      { label: 'RSS', href: '/rss.xml', icon: 'rss' },
    ],
  },
]

export default function SiteSidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/'
    ? pathname === '/' || pathname.startsWith('/posts/')
    : pathname.startsWith(href)

  return (
    <aside className="site-sidebar" aria-label="侧边导航">
      <nav>
        {groups.map((group) => (
          <section className="sidebar-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => (
              <Link key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </section>
        ))}
      </nav>
      <p className="sidebar-verse">明日巴陵道，<br />秋山又几重。</p>
    </aside>
  )
}

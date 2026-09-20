'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon, { type IconName } from './Icon'

const groups: Array<{ label: string; items: Array<{ label: string; href: string; icon: IconName }> }> = [
  {
    label: '首页',
    items: [
      { label: '近况', href: '/', icon: 'orbit' },
    ],
  },
  {
    label: '抽屉',
    items: [
      { label: '博文', href: '/posts', icon: 'post' },
      { label: '短记', href: '/say', icon: 'say' },
    ],
  },
  {
    label: '途中',
    items: [
      { label: '美食', href: '/food', icon: 'food' },
      { label: '相册', href: '/gallery', icon: 'gallery' },
      { label: '运动', href: '/workouts', icon: 'activity' },
    ],
  },
  {
    label: '交流',
    items: [
      { label: '留言', href: '/message', icon: 'message' },
    ],
  },
]

export default function SiteSidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  const isAboutActive = isActive('/about')

  return (
    <aside className="site-sidebar" aria-label="侧边导航">
      <nav>
        {groups.map((group) => (
          <section className="sidebar-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map((item) => {
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
          </section>
        ))}

        {/* 独立一级导航：关于 */}
        <section className="sidebar-group sidebar-standalone">
          <Link
            href="/about"
            className={isAboutActive ? 'active' : ''}
            aria-current={isAboutActive ? 'page' : undefined}
          >
            <Icon name="about" />
            <span>关于</span>
          </Link>
        </section>
      </nav>
      <p className="sidebar-verse">苔花如米小<br />也学牡丹开</p>
    </aside>
  )
}

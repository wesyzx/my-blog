'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

const mobileGroups = [
  {
    label: '抽屉',
    items: [
      { label: '博文', href: '/', icon: 'post' as const },
      { label: '说说', href: '/say', icon: 'say' as const },
    ],
  },
  {
    label: '途中',
    items: [
      { label: '美食', href: '/food', icon: 'food' as const },
      { label: '相册', href: '/gallery', icon: 'gallery' as const },
    ],
  },
  {
    label: '交流',
    items: [
      { label: '留言', href: '/message', icon: 'message' as const },
    ],
  },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsDark(document.documentElement.dataset.theme === 'dark')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const isActive = (href: string) => href === '/' ? pathname === '/' || pathname.startsWith('/posts/') : pathname.startsWith(href)

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-brand" aria-label="轨道之外首页">
          <span className="brand-icon"><Icon name="orbit" /></span><span>轨道之外</span>
        </Link>

        <nav className="desktop-nav desktop-section-nav" aria-label="栏目导航">
          <Link href="/" className={pathname === '/' || pathname.startsWith('/posts/') || pathname === '/say' ? 'active' : ''}>抽屉</Link>
          <Link href="/gallery" className={pathname.startsWith('/gallery') || pathname.startsWith('/food') ? 'active' : ''}>途中</Link>
          <Link href="/about" className={pathname === '/about' ? 'active' : ''}>关于</Link>
          <button type="button" className="icon-button" onClick={toggleTheme} aria-label={isDark ? '切换浅色模式' : '切换深色模式'}>
            <Icon name={isDark ? 'sun' : 'moon'} />
          </button>
        </nav>

        <button type="button" className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? '关闭导航' : '打开导航'}>
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-navigation" className="mobile-nav">
          <nav aria-label="移动端导航">
            {mobileGroups.map((group) => (
              <div key={group.label} className="mobile-nav-group">
                <p className="mobile-group-label">{group.label}</p>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={isActive(item.href) ? 'active' : ''}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <span className="mobile-nav-icon"><Icon name={item.icon} /></span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}

            <div className="mobile-nav-group mobile-nav-standalone">
              <Link
                href="/about"
                onClick={() => setMenuOpen(false)}
                className={isActive('/about') ? 'active' : ''}
                aria-current={isActive('/about') ? 'page' : undefined}
              >
                <span className="mobile-nav-icon"><Icon name="about" /></span>
                <span>关于</span>
              </Link>
            </div>
          </nav>
          <button type="button" className="mobile-theme-button" onClick={toggleTheme}><Icon name={isDark ? 'sun' : 'moon'} />{isDark ? '使用浅色模式' : '使用深色模式'}</button>
        </div>
      )}
    </header>
  )
}

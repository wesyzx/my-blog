'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

const mobileGroups = [
  {
    label: '首页',
    items: [
      { label: '近况', href: '/', icon: 'orbit' as const },
    ],
  },
  {
    label: '抽屉',
    items: [
      { label: '博文', href: '/posts', icon: 'post' as const },
      { label: '短记', href: '/say', icon: 'say' as const },
    ],
  },
  {
    label: '途中',
    items: [
      { label: '美食', href: '/food', icon: 'food' as const },
      { label: '相册', href: '/gallery', icon: 'gallery' as const },
      { label: '运动', href: '/workouts', icon: 'activity' as const },
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
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileNavRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!menuOpen || !mobileNavRef.current) return

    const navigation = mobileNavRef.current
    const focusableSelector = 'a[href], button:not([disabled])'
    const firstFocusable = navigation.querySelector<HTMLElement>(focusableSelector)
    firstFocusable?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        menuButtonRef.current?.focus()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = Array.from(navigation.querySelectorAll<HTMLElement>(focusableSelector))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand" aria-label="轨道之外首页">
            {/* 品牌图标用 CSS mask + currentColor 上色，自动跟随 --color-accent，深浅色模式自适应 */}
            <span className="brand-icon" aria-hidden="true" /><span>轨道之外</span>
          </Link>

          <nav className="desktop-nav desktop-section-nav" aria-label="栏目导航">
            <Link href="/" className={pathname === '/' ? 'active' : ''}>首页</Link>
            <Link href="/posts" className={pathname.startsWith('/posts') || pathname === '/say' ? 'active' : ''}>抽屉</Link>
            <Link href="/gallery" className={pathname.startsWith('/gallery') || pathname.startsWith('/food') || pathname.startsWith('/workouts') ? 'active' : ''}>途中</Link>
            <Link href="/about" className={pathname === '/about' ? 'active' : ''}>关于</Link>
            <button type="button" className="icon-button" onClick={toggleTheme} aria-label={isDark ? '切换浅色模式' : '切换深色模式'}>
              <Icon name={isDark ? 'sun' : 'moon'} />
            </button>
          </nav>

          <button ref={menuButtonRef} type="button" className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? '关闭导航' : '打开导航'}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div ref={mobileNavRef} id="mobile-navigation" className="mobile-nav" role="dialog" aria-modal="true" aria-label="站点导航">
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
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'

const postMenuItems = ['生活', '技术', '摄影', '学习']
const navItems = [
  { label: '博文', href: '/', icon: 'post' as const },
  { label: '说说', href: '/say', icon: 'say' as const },
  { label: '美食', href: '/food', icon: 'food' as const },
  { label: '相册', href: '/gallery', icon: 'gallery' as const },
  { label: '留言', href: '/message', icon: 'message' as const },
  { label: '关于', href: '/about', icon: 'about' as const },
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

        <nav className="desktop-nav" aria-label="主导航">
          {navItems.map((item) => item.href === '/' ? (
            <div key={item.href} className="nav-group">
              <Link href={item.href} className={`nav-link ${isActive(item.href) ? 'active' : ''}`}>
                {item.label}<Icon name="chevron-down" className="nav-chevron" />
              </Link>
              <div className="category-menu">
                {postMenuItems.map((category) => <Link key={category} href={`/?category=${encodeURIComponent(category)}`}>{category}</Link>)}
              </div>
            </div>
          ) : <Link key={item.href} href={item.href} className={`nav-link ${isActive(item.href) ? 'active' : ''}`}>{item.label}</Link>)}
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
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={isActive(item.href) ? 'active' : ''}>
                <span className="mobile-nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <button type="button" className="mobile-theme-button" onClick={toggleTheme}><Icon name={isDark ? 'sun' : 'moon'} />{isDark ? '使用浅色模式' : '使用深色模式'}</button>
        </div>
      )}
    </header>
  )
}

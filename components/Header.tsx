'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'
import ThemeToggle from './ThemeToggle'
import { SITE_NAV_ITEMS } from './siteNavigation'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileNavRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

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

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-brand" aria-label="轨道之外首页">
            {/* 品牌图标用 CSS mask + currentColor 上色，自动跟随 --color-accent，深浅色模式自适应 */}
            <span className="brand-icon" aria-hidden="true" /><span>轨道之外</span>
          </Link>

          <button ref={menuButtonRef} type="button" className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="mobile-navigation" aria-label={menuOpen ? '关闭导航' : '打开导航'}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div ref={mobileNavRef} id="mobile-navigation" className="mobile-nav" role="dialog" aria-modal="true" aria-label="站点导航">
          <nav aria-label="移动端导航">
            <div className="mobile-nav-list">
              {SITE_NAV_ITEMS.map((item) => (
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
          </nav>
          <ThemeToggle variant="mobile" />
        </div>
      )}
    </>
  )
}

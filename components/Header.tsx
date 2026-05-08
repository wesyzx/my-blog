'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const postMenuItems = [
  { label: '生活', href: '/?category=生活' },
  { label: '技术', href: '/?category=技术' },
  { label: '摄影', href: '/?category=摄影' },
  { label: '学习', href: '/?category=学习' },
]

const navItems = [
  { label: '博文', href: '/', hasDropdown: true },
  { label: '说说', href: '/say' },
  { label: '美食', href: '/food' },
  { label: '相册', href: '/gallery' },
  { label: '留言板', href: '/message' },
  { label: '关于', href: '/about' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    setIsDark(html.getAttribute('data-theme') === 'dark')
  }, [])

  const toggleTheme = () => {
    const html = document.documentElement
    const next = !isDark
    setIsDark(next)
    html.setAttribute('data-theme', next ? 'dark' : 'light')
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch (e) {}
  }

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* ===== 主导航栏 ===== */}
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 h-[60px] flex items-center justify-between">
        {/* Logo — 温暖简洁 */}
        <Link href="/" className="flex items-center gap-3 leading-tight group">
          <div
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-[16px] font-bold"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            不
          </div>
          <div className="flex flex-col">
            <span
              className="text-[22px] font-extrabold tracking-tight leading-none"
              style={{
                color: 'var(--color-heading)',
                fontFamily: "Georgia, 'Noto Serif SC', serif",
              }}
            >
              不赶
            </span>
            <span className="text-[11px] font-medium italic mt-0.5" style={{ color: 'var(--color-muted)' }}>
              为食而生
            </span>
          </div>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) =>
            item.hasDropdown ? (
              <div key={item.label} className="relative group">
                <Link href={item.href} className="nav-link inline-flex items-center gap-1">
                  {item.label}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="mt-0.5">
                    <path d="M2 3l3 4 3-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </Link>
                <div className="absolute left-0 top-full pt-2 hidden group-hover:block">
                  <div className="dropdown-menu">
                    {postMenuItems.map((sub) => (
                      <Link key={sub.href} href={sub.href} className="dropdown-item">
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link key={item.label} href={item.href} className="nav-link">
                {item.label}
              </Link>
            )
          )}

          <span className="mx-1" style={{ color: 'var(--color-border-strong)' }}>|</span>
          <button onClick={toggleTheme} className="nav-icon text-[16px]" aria-label="切换主题">
            {isDark ? '☀' : '☾'}
          </button>
          <button className="nav-icon text-[18px]" aria-label="搜索">
            ⌕
          </button>
        </nav>

        {/* 移动端菜单按钮 */}
        <button
          className="md:hidden p-2 rounded"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ color: 'var(--color-heading)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* 移动端菜单 */}
      {menuOpen && (
        <div
          className="md:hidden border-t absolute w-full shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          <Link href="/" className="mobile-nav-item" onClick={() => setMenuOpen(false)}>
            博文
          </Link>
          {postMenuItems.map((item) => (
            <Link key={item.href} href={item.href} className="mobile-nav-sub" onClick={() => setMenuOpen(false)}>
              └ {item.label}
            </Link>
          ))}

          {navItems.filter(n => !n.hasDropdown).map((item) => (
            <Link key={item.href} href={item.href} className="mobile-nav-item" onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}

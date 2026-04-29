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
      {/* ===== 顶部社交栏 ===== */}
      <div
        className="hidden md:flex items-center justify-end gap-3 px-4 md:px-8 py-1.5 text-[13px] border-b"
        style={{
          backgroundColor: 'var(--color-bg)',
          borderColor: 'var(--color-border)',
        }}
      >
        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
        <a href="mailto:hi@veryjack.com" className="social-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
        </a>
        <span style={{ color: 'var(--color-border-strong)' }}>|</span>
        <a href="/feed.xml" className="social-link font-medium">RSS</a>
      </div>

      {/* ===== 主导航栏 ===== */}
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 h-[60px] flex items-center justify-between">
        {/* Logo — 温暖简洁 */}
        <Link href="/" className="flex items-center gap-3 leading-tight group">
          <div
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-[16px] font-bold"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            J
          </div>
          <div className="flex flex-col">
            <span
              className="text-[22px] font-extrabold tracking-tight leading-none"
              style={{
                color: 'var(--color-heading)',
                fontFamily: "Georgia, 'Noto Serif SC', serif",
              }}
            >
              Jack's Space
            </span>
            <span className="text-[11px] font-medium italic mt-0.5" style={{ color: 'var(--color-muted)' }}>
              Everything happens for the best
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
          <div
            className="px-4 py-3 border-b flex items-center gap-4 text-[13px]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">𝕏</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-link">GitHub</a>
            <a href="mailto:hi@veryjack.com" className="social-link">Email</a>
            <span style={{ color: 'var(--color-border-strong)' }}>|</span>
            <a href="/feed.xml" className="social-link">RSS</a>
            <span className="flex-1" />
            <button onClick={toggleTheme} className="nav-icon text-[15px]" aria-label="切换主题">
              {isDark ? '☀' : '☾'}
            </button>
          </div>

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

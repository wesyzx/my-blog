'use client'

/**
 * 全局顶部导航栏组件
 *
 * 功能：
 * - Logo + 站名
 * - 「博文」下拉菜单（生活/技术/摄影/学习分类）
 * - 导航链接：说说 / 美食 / 相册 / 留言板 / 关于
 * - 深色/浅色主题切换
 * - 移动端全屏汉堡菜单
 *
 * 使用 CSS 变量适配明暗主题，
 * 粘性定位（sticky）始终在页面顶部可见。
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * 博文分类下拉菜单项
 */
const postMenuItems = [
  { label: '生活', href: '/?category=生活' },
  { label: '技术', href: '/?category=技术' },
  { label: '摄影', href: '/?category=摄影' },
  { label: '学习', href: '/?category=学习' },
]

/**
 * 主导航菜单项
 */
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
  const pathname = usePathname()

  useEffect(() => {
    const html = document.documentElement
    setIsDark(html.getAttribute('data-theme') === 'dark')
  }, [])

  // 菜单打开时锁定 body 滚动
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // 路由变化时自动关闭菜单
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

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
    <>
      {/* ===== 顶部导航栏 ===== */}
      <header
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: 'var(--color-bg-nav)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '0.5px solid var(--color-border)',
        }}
      >
        <div className="max-w-[1100px] mx-auto px-6 h-[52px] flex items-center justify-between">
          {/* Logo - 红点 + 站名 */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-accent)' }}></div>
            <span
              className="text-[24px] font-bold tracking-tight"
              style={{
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-ui)',
              }}
            >
              莫赶
            </span>
            <span className="subtitle-en ml-1 hidden sm:inline-block">/ The Unhurried</span>
          </Link>

          {/* 桌面端导航 */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return item.hasDropdown ? (
                <div key={item.label} className="relative group">
                  <Link
                    href={item.href}
                    className={`nav-link inline-flex items-center gap-1 ${isActive ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                  <div className="absolute left-0 top-full pt-2 hidden group-hover:block animate-fade-up">
                    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-2 min-w-[140px] shadow-xl">
                      {postMenuItems.map((sub) => (
                        <Link key={sub.href} href={sub.href} className="block px-4 py-2 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-surface)] rounded-[var(--radius-sm)]">
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              )
            })}

            <div className="w-[1px] h-3 mx-2" style={{ backgroundColor: 'var(--color-border)' }}></div>

            <button onClick={toggleTheme} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
              {isDark ? '☀' : '☾'}
            </button>
          </nav>

          {/* 移动端汉堡按钮 */}
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ color: 'var(--color-text-primary)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* ===== 移动端全屏菜单（独立于 header 之外，避免 iOS Safari fixed 定位异常） ===== */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[100] flex flex-col px-6"
          style={{
            backgroundColor: 'var(--color-bg-page)',
            paddingTop: '68px',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
          }}
        >
          {/* 遮罩内容可滚动 */}
          <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            <div className="flex flex-col gap-6 py-4">
              {navItems.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    className="text-[22px] font-semibold"
                    style={{
                      color: 'var(--color-text-primary)',
                      fontFamily: "Georgia, 'Noto Serif SC', serif",
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.hasDropdown && (
                    <div className="grid grid-cols-2 gap-3 mt-3 ml-2">
                      {postMenuItems.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className="text-[16px] px-3 py-2 rounded-lg transition-colors"
                          style={{
                            color: 'var(--color-text-secondary)',
                            backgroundColor: 'var(--color-bg-surface)',
                          }}
                          onClick={() => setMenuOpen(false)}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

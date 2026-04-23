'use client'

import { useState } from 'react'
import Link from 'next/link'

const postMenuItems = [
  { label: '生活', href: '/?category=生活' },
  { label: '技术', href: '/?category=技术' },
  { label: '摄影', href: '/?category=摄影' },
  { label: '学习', href: '/?category=学习' },
]

const drawerMenuItems = [
  { label: '书影音', href: '/library-movie' },
  { label: '好东西', href: '/share' },
  { label: '小伙伴', href: '/friendlink' },
  { label: '人生地图', href: '/map' },
  { label: '支持我', href: '/support_me' },
  { label: '更多', href: '/more' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-[#e7e9ef] relative z-50 shadow-[0_2px_8px_rgba(34,56,101,0.04)]">
      {/* Top bar with social links */}
      <div className="bg-[#293241] text-[#98c1d9] py-2 hidden md:block">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-4">
            <span>Everything happens for the best</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="hover:text-[#7db9de] transition-colors" aria-label="Twitter">𝕏</a>
            <a href="#" className="hover:text-[#7db9de] transition-colors" aria-label="Instagram">📷</a>
            <a href="#" className="hover:text-[#7db9de] transition-colors" aria-label="RSS">RSS</a>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 md:px-8 h-[80px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight group">
          <span className="text-[28px] font-bold text-[#293241] tracking-tight group-hover:text-[#98c1d9] transition-colors">
            The Unhurried
          </span>
          <span className="text-[11px] text-[#475671] mt-0.5 font-medium italic">
            不慌不忙，记录生活
          </span>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden md:flex items-center gap-6">
          <div className="relative group">
            <Link href="/" className="text-[14px] font-semibold uppercase tracking-wide text-[#475671] hover:text-[#98c1d9] transition-colors">
              博文
            </Link>
            <div className="absolute left-0 top-full pt-3 hidden group-hover:block">
              <div className="bg-white border border-[#e7e9ef] rounded-[5px] shadow-[0_10px_20px_rgba(34,56,101,0.08)] p-2 min-w-[120px]">
                {postMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-[14px] text-[#475671] hover:text-[#98c1d9] hover:bg-[#f3f4f7] rounded transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="relative group">
            <Link href="/more" className="text-[14px] font-semibold uppercase tracking-wide text-[#475671] hover:text-[#98c1d9] transition-colors">
              抽屉
            </Link>
            <div className="absolute left-0 top-full pt-3 hidden group-hover:block">
              <div className="bg-white border border-[#e7e9ef] rounded-[5px] shadow-[0_10px_20px_rgba(34,56,101,0.08)] p-2 min-w-[140px]">
                {drawerMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-[14px] text-[#475671] hover:text-[#98c1d9] hover:bg-[#f3f4f7] rounded transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link href="/say" className="text-[14px] font-semibold uppercase tracking-wide text-[#475671] hover:text-[#98c1d9] transition-colors">
            说说
          </Link>
          <Link href="/gallery" className="text-[14px] font-semibold uppercase tracking-wide text-[#475671] hover:text-[#98c1d9] transition-colors">
            相册
          </Link>
          <Link href="/message" className="text-[14px] font-semibold uppercase tracking-wide text-[#475671] hover:text-[#98c1d9] transition-colors">
            留言板
          </Link>
          <Link href="/about" className="text-[14px] font-semibold uppercase tracking-wide text-[#475671] hover:text-[#98c1d9] transition-colors">
            关于
          </Link>
          
          <span className="text-[#e7e9ef]">|</span>
          
          <button aria-label="search" className="text-[#475671] hover:text-[#98c1d9] text-[16px] leading-none transition-colors" title="搜索">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </nav>

        {/* 移动端菜单按钮 */}
        <button
          className="md:hidden text-[#293241] p-2 rounded hover:bg-[#f3f4f7] transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2">
            {menuOpen
              ? <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              : <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
            }
          </svg>
        </button>
      </div>

      {/* 移动端菜单 */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#e7e9ef] bg-white shadow-lg">
          <Link href="/" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-[#f3f4f7]" onClick={() => setMenuOpen(false)}>博文</Link>
          {postMenuItems.map((item) => (
            <Link key={item.href} href={item.href} className="block pl-10 pr-6 py-3 text-[14px] text-[#475671] hover:text-[#98c1d9] hover:bg-[#f3f4f7] border-b border-[#f3f4f7] transition-colors" onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}

          <Link href="/more" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-[#f3f4f7]" onClick={() => setMenuOpen(false)}>抽屉</Link>
          {drawerMenuItems.map((item) => (
            <Link key={item.href} href={item.href} className="block pl-10 pr-6 py-3 text-[14px] text-[#475671] hover:text-[#98c1d9] hover:bg-[#f3f4f7] border-b border-[#f3f4f7] transition-colors" onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}

          <Link href="/say" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-[#f3f4f7]" onClick={() => setMenuOpen(false)}>说说</Link>
          <Link href="/gallery" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-[#f3f4f7]" onClick={() => setMenuOpen(false)}>相册</Link>
          <Link href="/message" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-[#f3f4f7]" onClick={() => setMenuOpen(false)}>留言板</Link>
          <Link href="/about" className="block px-6 py-4 text-[15px] font-medium text-[#475671]" onClick={() => setMenuOpen(false)}>关于</Link>
        </div>
      )}
    </header>
  )
}

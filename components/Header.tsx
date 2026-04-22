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
    <header className="bg-white border-b border-[#eef1f5] relative z-50">
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 h-[86px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight group">
          <span className="text-[25px] font-bold text-[#293241] tracking-normal">
            The Unhurried
          </span>
          <span className="text-[12px] text-[#475671] mt-1 font-medium">
            不慌不忙，记录生活
          </span>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden md:flex items-center gap-5">
          <div className="relative group">
            <Link href="/" className="text-[14px] font-semibold text-[#475671] hover:text-[#98c1d9] transition-colors">
              博文
            </Link>
            <div className="absolute left-0 top-full pt-3 hidden group-hover:block">
              <div className="bg-white border border-[#e7e9ef] rounded-[5px] shadow-[0_10px_20px_rgba(34,56,101,0.08)] p-2 min-w-[120px]">
                {postMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-[14px] text-[#475671] hover:text-[#98c1d9] hover:bg-[#f3f4f7] rounded"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="relative group">
            <Link href="/more" className="text-[14px] font-semibold text-[#475671] hover:text-[#98c1d9] transition-colors">
              抽屉
            </Link>
            <div className="absolute left-0 top-full pt-3 hidden group-hover:block">
              <div className="bg-white border border-[#e7e9ef] rounded-[5px] shadow-[0_10px_20px_rgba(34,56,101,0.08)] p-2 min-w-[140px]">
                {drawerMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-[14px] text-[#475671] hover:text-[#98c1d9] hover:bg-[#f3f4f7] rounded"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link href="/say" className="text-[14px] font-semibold text-[#475671] hover:text-[#98c1d9] transition-colors">
            说说
          </Link>
          <Link href="/gallery" className="text-[14px] font-semibold text-[#475671] hover:text-[#98c1d9] transition-colors">
            相册
          </Link>
          <Link href="/message" className="text-[14px] font-semibold text-[#475671] hover:text-[#98c1d9] transition-colors">
            留言板
          </Link>
          <Link href="/about" className="text-[14px] font-semibold text-[#475671] hover:text-[#98c1d9] transition-colors">
            关于
          </Link>
          <span className="text-[#475671] text-[14px]">•</span>
          <button aria-label="theme" className="text-[#475671] hover:text-[#98c1d9] text-[16px] leading-none">☼</button>
          <button aria-label="search" className="text-[#475671] hover:text-[#98c1d9] text-[14px] leading-none">⌕</button>
        </nav>

        {/* 移动端菜单按钮 */}
        <button
          className="md:hidden text-[#293241] p-2 rounded hover:bg-gray-50"
          onClick={() => setMenuOpen(!menuOpen)}
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
        <div className="md:hidden border-t border-gray-100 bg-white absolute w-full shadow-lg">
          <Link href="/" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-gray-50" onClick={() => setMenuOpen(false)}>博文</Link>
          {postMenuItems.map((item) => (
            <Link key={item.href} href={item.href} className="block pl-10 pr-6 py-3 text-[14px] text-[#475671] hover:text-[#98c1d9] hover:bg-gray-50 border-b border-gray-50" onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}

          <Link href="/more" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-gray-50" onClick={() => setMenuOpen(false)}>抽屉</Link>
          {drawerMenuItems.map((item) => (
            <Link key={item.href} href={item.href} className="block pl-10 pr-6 py-3 text-[14px] text-[#475671] hover:text-[#98c1d9] hover:bg-gray-50 border-b border-gray-50" onClick={() => setMenuOpen(false)}>
              {item.label}
            </Link>
          ))}

          <Link href="/say" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-gray-50" onClick={() => setMenuOpen(false)}>说说</Link>
          <Link href="/gallery" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-gray-50" onClick={() => setMenuOpen(false)}>相册</Link>
          <Link href="/message" className="block px-6 py-4 text-[15px] font-medium text-[#475671] border-b border-gray-50" onClick={() => setMenuOpen(false)}>留言板</Link>
          <Link href="/about" className="block px-6 py-4 text-[15px] font-medium text-[#475671]" onClick={() => setMenuOpen(false)}>关于</Link>
        </div>
      )}
    </header>
  )
}

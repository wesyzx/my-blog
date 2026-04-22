'use client'

import { useState } from 'react'
import Link from 'next/link'

const navItems = [
  { label: '博文', href: '/' },
  { label: '相册', href: '/gallery' },
  { label: '留言板', href: '/message' },
  { label: '关于', href: '/about' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="bg-white shadow-[0_5px_15px_rgba(0,0,0,0.03)] relative z-50">
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 h-[90px] flex items-center justify-between">
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
        <nav className="hidden sm:flex items-center gap-7">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] font-medium text-[#475671] hover:text-[#98c1d9] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 移动端菜单按钮 */}
        <button
          className="sm:hidden text-[#293241] p-2 rounded hover:bg-gray-50"
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
        <div className="sm:hidden border-t border-gray-100 bg-white absolute w-full shadow-lg">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-6 py-4 text-[15px] font-medium text-[#475671] hover:text-[#98c1d9] hover:bg-gray-50 border-b border-gray-50 last:border-0"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
'use client'

import { useState } from 'react'
import Link from 'next/link'

const navItems = [
  { label: '博文', href: '/' },
  { label: '相册', href: '/gallery' },
  { label: '留言', href: '/message' },
  { label: '关于', href: '/about' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-xl font-bold text-gray-900 tracking-wide font-serif">
            The Unhurried
          </span>
          <span className="text-xs text-gray-400 mt-1 italic">
            Everything happens for the best
          </span>
        </Link>

        {/* 桌面导航 */}
        <nav className="hidden sm:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 移动端菜单按钮 */}
        <button
          className="sm:hidden text-gray-500"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
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
        <div className="sm:hidden border-t border-gray-100 bg-white">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-3 text-sm text-gray-600 hover:bg-gray-50"
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
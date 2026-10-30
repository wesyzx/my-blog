'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import SiteSidebar from './SiteSidebar'
import ThemeToggle from './ThemeToggle'

export default function SiteFrame({ children }: { children: ReactNode }) {
  const isHome = usePathname() === '/'

  return (
    <div className={`site-frame${isHome ? '' : ' site-frame--wide'}`}>
      {isHome && <ThemeToggle />}
      {isHome && <SiteSidebar />}
      <main className="site-content">{children}</main>
    </div>
  )
}

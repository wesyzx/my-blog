import type { ReactNode } from 'react'
import SiteSidebar from './SiteSidebar'
import ThemeToggle from './ThemeToggle'

export default function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="site-frame">
      <ThemeToggle />
      <SiteSidebar />
      <main className="site-content">{children}</main>
    </div>
  )
}

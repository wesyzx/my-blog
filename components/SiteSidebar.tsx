'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon, { type IconName } from './Icon'

/**
 * 侧栏品牌图：作者头像（对齐 ueno 的 .side_logo，120px 方形）。
 *
 * 两个注意点：
 *  1. 原图是 2.9MB 的 PNG，必须带七牛缩图参数，否则侧栏要拖一张近 3MB 的图。
 *  2. 加 `unoptimized`：这里已经用 imageMogr2 缩到 240px 了，
 *     再走一遍 Next 的图片优化器没有收益，也少一层远程抓取。
 */
const AUTHOR_AVATAR = 'https://img.guanyan.me/2026/05/fa7d85a90137299c295a3cdbe9790395.png?imageMogr2/thumbnail/240x/quality/80/format/webp'

const groups: Array<{ label: string; items: Array<{ label: string; href: string; icon: IconName }> }> = [
  {
    label: '首页',
    items: [
      { label: '近况', href: '/', icon: 'orbit' },
    ],
  },
  {
    label: '抽屉',
    items: [
      { label: '博文', href: '/posts', icon: 'post' },
      { label: '短记', href: '/say', icon: 'say' },
    ],
  },
  {
    label: '途中',
    items: [
      { label: '美食', href: '/food', icon: 'food' },
      { label: '相册', href: '/gallery', icon: 'gallery' },
      { label: '运动', href: '/workouts', icon: 'activity' },
    ],
  },
  {
    label: '交流',
    items: [
      { label: '留言', href: '/message', icon: 'message' },
    ],
  },
]

export default function SiteSidebar() {
  const pathname = usePathname()
  const [isDark, setIsDark] = useState(false)

  // 桌面端顶栏已取消，主题切换搬到这里；逻辑与 Header 保持一致
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsDark(document.documentElement.dataset.theme === 'dark')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)
  const isAboutActive = isActive('/about')

  return (
    <aside className="site-sidebar" aria-label="站点导航">
      <div className="sidebar-inner">
        <Link href="/" className="sidebar-brand" aria-label="轨道之外首页">
          <span className="sidebar-logo">
            <Image src={AUTHOR_AVATAR} alt="" width={120} height={120} className="sidebar-avatar" unoptimized fetchPriority="high" />
          </span>
          <span className="sidebar-title">轨道之外</span>
          <span className="sidebar-desc">把日子写下来，等它们慢慢发光。</span>
        </Link>

        <nav className="sidebar-nav">
          {groups.map((group) => (
            <section className="sidebar-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? 'active' : ''}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </section>
          ))}

          {/* 独立一级导航：关于 */}
          <section className="sidebar-group sidebar-standalone">
            <Link
              href="/about"
              className={isAboutActive ? 'active' : ''}
              aria-current={isAboutActive ? 'page' : undefined}
            >
              <Icon name="about" />
              <span>关于</span>
            </Link>
          </section>
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-social">
            <a href="https://github.com/wesyzx" target="_blank" rel="noreferrer" aria-label="GitHub">
              <Icon name="github" />
            </a>
            <a href="/rss.xml" aria-label="RSS 订阅">
              <Icon name="rss" />
            </a>
          </div>

          <p className="sidebar-verse">苔花如米小<br />也学牡丹开</p>

          <button
            type="button"
            className="sidebar-theme"
            onClick={toggleTheme}
            aria-label={isDark ? '切换浅色模式' : '切换深色模式'}
          >
            <Icon name={isDark ? 'sun' : 'moon'} />
            <span>{isDark ? '浅色模式' : '深色模式'}</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

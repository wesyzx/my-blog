'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import RunningTime from './RunningTime'

export default function Footer() {
  useEffect(() => {
    // 加载不蒜子访客统计脚本
    const script = document.createElement('script')
    script.async = true
    script.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'
    document.body.appendChild(script)
  }, [])

  return (
    <footer
      className="mt-[64px] border-t transition-colors duration-300"
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {/* 第一行：运行时间 + 访客统计 */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] mb-5">
          <RunningTime />
          <span style={{ color: 'var(--color-border-hover)' }}>|</span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            总访问{' '}
            <span
              id="busuanzi_value_site_uv"
              style={{ color: 'var(--color-accent)', fontWeight: 500 }}
            >
              -
            </span>{' '}
            次
          </span>
          <span style={{ color: 'var(--color-border-hover)' }}>|</span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            今日{' '}
            <span
              id="busuanzi_value_site_pv"
              style={{ color: 'var(--color-accent)', fontWeight: 500 }}
            >
              -
            </span>{' '}
            次浏览
          </span>
        </div>

        {/* 第二行：版权 + 协议 */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] mb-5">
          <span style={{ color: 'var(--color-text-muted)' }}>
            © 2016–2026{' '}
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
              不赶
            </span>
          </span>
          <span style={{ color: 'var(--color-border-hover)' }}>·</span>
          <span style={{ color: 'var(--color-text-muted)' }}>为食而生</span>
          <span style={{ color: 'var(--color-border-hover)' }}>·</span>
          <a
            href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-accent)] transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            CC BY-NC-ND 4.0
          </a>
        </div>

        {/* 第三行：技术标识 */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
          <Link
            href="https://nextjs.org"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            style={{
              color: 'var(--color-text-hint)',
              borderColor: 'var(--color-border)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.95 18l-1.414 1.414L9.414 13.12l-2.12 2.12L6 13.828V18h4.172l-1.293-1.293 2.12-2.12L16.95 18z"/>
            </svg>
            Next.js
          </Link>

          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
            style={{
              color: 'var(--color-text-hint)',
              borderColor: 'var(--color-border)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 2.25a.75.75 0 01.75.75v2.25H19.5a3 3 0 013 3V19.5a3 3 0 01-3 3h-15a3 3 0 01-3-3V8.25a3 3 0 013-3h2.25V3a.75.75 0 011.5 0v2.25h6V3a.75.75 0 01.75-.75zM4.5 8.25a1.5 1.5 0 00-1.5 1.5V19.5a1.5 1.5 0 001.5 1.5h15a1.5 1.5 0 001.5-1.5V9.75a1.5 1.5 0 00-1.5-1.5h-15zm11.78 2.47a.75.75 0 010 1.06l-2.47 2.47 2.47 2.47a.75.75 0 11-1.06 1.06l-3-3a.75.75 0 010-1.06l3-3a.75.75 0 011.06 0zM7.72 10.78a.75.75 0 000 1.06l3 3a.75.75 0 01-1.06 1.06l-3-3a.75.75 0 010-1.06l3-3a.75.75 0 011.06 0z"/>
            </svg>
            Cloudflare
          </span>

          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
            style={{
              color: 'var(--color-text-hint)',
              borderColor: 'var(--color-border)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
            EdgeOne
          </span>
        </div>
      </div>
    </footer>
  )
}

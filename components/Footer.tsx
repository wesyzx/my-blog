'use client'

/**
 * 全局底部栏组件
 *
 * 展示信息：
 * 1. 博客运行时间 + 自建访客统计
 * 2. 敬平凡... 标语 (居中)
 * 3. 技术栈标识（Next.js / Cloudflare / EdgeOne / 又拍云）
 * 4. 版权声明与 ICP 备案号 (最底部，左右分布)
 */
import Link from 'next/link'
import RunningTime from './RunningTime'
import VisitorStats from './VisitorStats'

export default function Footer() {
  return (
    <footer
      className="mt-[64px] border-t transition-colors duration-300"
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <div className="flex flex-col items-center gap-8">
          {/* 第一行：运行时间 + 浏览统计 */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] opacity-80">
            <RunningTime />
            <span style={{ color: 'var(--color-border-hover)' }} className="opacity-30">|</span>
            <VisitorStats />
          </div>

          {/* 第二行：敬语标语 */}
          <div className="text-center">
            <p className="text-[14px] text-[var(--color-text-secondary)] tracking-[0.1em] font-serif italic">
              敬平凡，敬放下，敬坚持，敬付出
            </p>
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
              <svg width="14" height="14" viewBox="0 0 128 128" fill="none">
                <circle cx="64" cy="64" r="64" fill="currentColor" className="text-[var(--color-text-primary)]"/>
                <path d="M106.317 112.014L49.167 38.4H38.4v51.2h10.767V58.531l49.556 63.615 7.594-10.132z" fill="var(--color-bg-surface)"/>
              </svg>
              Next.js
            </Link>

            <Link
              href="https://www.cloudflare.com"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              style={{
                color: 'var(--color-text-hint)',
                borderColor: 'var(--color-border)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 128 128" fill="none">
                <path d="M64 16C37.5 16 16 37.5 16 64s21.5 48 48 48 48-21.5 48-48S90.5 16 64 16zm23.5 71.5l-6.5 4-13-16-13 16-6.5-4 19.5-24 19.5 24z" fill="#F6821F"/>
                <path d="M40 64c0-13.3 10.7-24 24-24s24 10.7 24 24-10.7 24-24 24c-5.5 0-10.7-1.9-14.8-5l-4.7 5.8c5.4 4.3 12.3 6.9 19.5 6.9 17.7 0 32-14.3 32-32S105.7 32 88 32 56 46.3 56 64c0 2.1.2 4.2.6 6.2l-7.5 9.2C48.4 76.5 48 70.3 48 64c0-22.1 17.9-40 40-40s40 17.9 40 40-17.9 40-40 40c-8.7 0-16.7-2.8-23.2-7.5l-4.8 5.9c7.7 5.9 17.4 9.4 28 9.4 26.5 0 48-21.5 48-48S114.5 16 88 16 40 37.5 40 64z" fill="#FAAE44"/>
              </svg>
              Cloudflare
            </Link>

            <Link
              href="https://www.tencentcloud.com/zh/products/teo"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              style={{
                color: 'var(--color-text-hint)',
                borderColor: 'var(--color-border)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 128 128" fill="none">
                <defs>
                  <linearGradient id="eo-grad-footer-v2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#04B7FB"/>
                    <stop offset="100%" stopColor="#0078D4"/>
                  </linearGradient>
                </defs>
                <circle cx="64" cy="64" r="56" stroke="url(#eo-grad-footer-v2)" strokeWidth="8" fill="none"/>
                <path d="M64 24C41.9 24 24 41.9 24 64s17.9 40 40 40 40-17.9 40-40S86.1 24 64 24zm0 8c17.7 0 32 14.3 32 32s-14.3 32-32 32-32-14.3-32-32 14.3-32 32-32zm0 12c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20z" fill="url(#eo-grad-footer-v2)"/>
              </svg>
              EdgeOne
            </Link>

            <Link
              href="https://www.upyun.com/?utm_source=lianmeng&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              style={{
                color: 'var(--color-text-hint)',
                borderColor: 'var(--color-border)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 128 128" fill="none">
                <defs>
                  <linearGradient id="upy-grad-footer-v2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1DB0F0"/>
                    <stop offset="100%" stopColor="#00C851"/>
                  </linearGradient>
                </defs>
                <circle cx="64" cy="64" r="58" stroke="url(#upy-grad-footer-v2)" strokeWidth="8" fill="none"/>
                <path d="M82 48c-3 6-12 8-18 2s-4-14 2-20M52 76c-4-6-12-8-18-2s-4 14 3 20" stroke="url(#upy-grad-footer-v2)" strokeWidth="7" strokeLinecap="round"/>
              </svg>
              又拍云
            </Link>
          </div>

          {/* 第四行：版权与备案号 (左右分布) */}
          <div className="w-full pt-8 border-t border-[var(--color-border)] opacity-60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px]">
            <div className="text-[var(--color-text-muted)] order-2 sm:order-1">
              © 2016–{new Date().getFullYear()} <span className="font-medium text-[var(--color-text-primary)]">莫赶</span>
            </div>
            <div className="order-1 sm:order-2">
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--color-accent)] transition-colors"
                style={{ color: 'var(--color-text-hint)' }}
              >
                浙ICP备16031853号-1
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

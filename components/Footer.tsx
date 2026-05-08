'use client'

import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer
      className="mt-[64px] border-t transition-colors duration-300"
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* 左侧标语 */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link 
              href="/" 
              className="text-[14px] font-medium tracking-wide hover:opacity-80 transition-opacity"
              style={{ color: 'var(--color-accent)' }}
            >
              Everything happens for the best
            </Link>
            <div className="subtitle-en text-[12px] opacity-60">不赶 / The Unhurried</div>
          </div>

          {/* 右侧版权与协议 */}
          <div className="flex flex-col items-center md:items-end gap-2 text-[12px] text-[var(--color-text-muted)]">
            <p>
              © {currentYear} <span className="text-[var(--color-text-primary)] font-medium">不赶</span>
              {' · '}
              <a
                href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--color-accent)] transition-colors"
              >
                CC BY-NC-ND 4.0
              </a>
            </p>
            <p className="opacity-60">Powered by Next.js & TailwindCSS</p>
          </div>

        </div>
      </div>
    </footer>
  )
}

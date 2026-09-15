import Image from 'next/image'
import Link from 'next/link'

export default function AuthorCard() {
  return (
    <div className="card p-6 flex flex-col items-center text-center">
      {/* 头像 */}
      <div className="relative w-20 h-20 rounded-full overflow-hidden border border-[var(--color-border)] shadow-sm hover:scale-105 transition-transform duration-500 ease-out mb-4">
        <Image
          src="https://images.guanyan.me/%E7%BD%90%E5%A4%B4%E5%91%A8.png"
          alt="Can Chou"
          fill
          sizes="80px"
          className="object-cover"
          priority
        />
      </div>

      {/* 姓名与简介 */}
      <h3 className="text-[17px] font-bold text-[var(--color-text-primary)]" style={{ fontFamily: "Georgia, 'Noto Serif SC', serif" }}>
        Can Chou
      </h3>
      <p className="text-[11px] text-[var(--color-text-muted)] tracking-wider mt-0.5">
        @wesyzx
      </p>
      
      <p className="text-[13px] text-[var(--color-text-secondary)] mt-4 leading-relaxed border-t border-[var(--color-border)] pt-4 w-full">
        轨道之外时间，慢慢记录，用心感受。
      </p>

      {/* 社交链接 */}
      <div className="flex items-center justify-center gap-4 mt-5 w-full">
        {/* Email */}
        <a
          href="mailto:wesyzx@gmail.com"
          title="Email"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </a>

        {/* GitHub */}
        <a
          href="https://github.com/wesyzx"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
          </svg>
        </a>

        {/* Twitter */}
        <a
          href="https://x.com/wesyzx"
          target="_blank"
          rel="noopener noreferrer"
          title="Twitter"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all duration-300"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        {/* RSS */}
        <Link
          href="/rss.xml"
          title="RSS Feed"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.18 15.64a2.18 2.18 0 11-4.36 0 2.18 2.18 0 014.36 0zM12.63 21H8.38A6.38 6.38 0 002 14.63v-4.25A10.63 10.63 0 0112.63 21zM21 21h-4.25A14.75 14.75 0 002 6.25V2A19 19 0 0121 21z" />
          </svg>
        </Link>
      </div>

      {/* 了解更多 */}
      <Link
        href="/about"
        className="mt-6 w-full text-center text-[12px] font-medium py-2 rounded-md border transition-all duration-300 hover:bg-[var(--color-accent)] hover:text-white"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        了解更多关于我 →
      </Link>
    </div>
  )
}

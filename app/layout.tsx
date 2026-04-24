import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'The Unhurried',
    template: '%s | The Unhurried',
  },
  description: '不慌不忙，记录生活',
  openGraph: {
    title: 'The Unhurried',
    description: '不慌不忙，记录生活',
    url: 'https://guanyan.me',
    siteName: 'The Unhurried',
    locale: 'zh_CN',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <Header />
        <main className="min-h-screen py-5 md:py-[30px]" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="max-w-[1100px] mx-auto px-4 md:px-8">
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  )
}

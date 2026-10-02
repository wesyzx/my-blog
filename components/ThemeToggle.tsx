'use client'

import { useEffect, useState } from 'react'
import Icon from './Icon'

type ThemeToggleProps = {
  variant?: 'corner' | 'mobile'
}

export default function ThemeToggle({ variant = 'corner' }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const syncTheme = () => setIsDark(document.documentElement.dataset.theme === 'dark')
    const frame = window.requestAnimationFrame(syncTheme)
    window.addEventListener('themechange', syncTheme)
    window.addEventListener('storage', syncTheme)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('themechange', syncTheme)
      window.removeEventListener('storage', syncTheme)
    }
  }, [])

  const toggleTheme = () => {
    const nextIsDark = document.documentElement.dataset.theme !== 'dark'
    document.documentElement.dataset.theme = nextIsDark ? 'dark' : 'light'
    localStorage.setItem('theme', nextIsDark ? 'dark' : 'light')
    window.dispatchEvent(new Event('themechange'))
  }

  const label = isDark ? '使用浅色模式' : '使用深色模式'

  if (variant === 'mobile') {
    return (
      <button type="button" className="mobile-theme-button" onClick={toggleTheme} aria-label={label}>
        <Icon name={isDark ? 'sun' : 'moon'} />
        {label}
      </button>
    )
  }

  return (
    <button type="button" className="theme-toggle-corner" onClick={toggleTheme} aria-label={label} title={label}>
      <Icon name={isDark ? 'sun' : 'moon'} />
    </button>
  )
}

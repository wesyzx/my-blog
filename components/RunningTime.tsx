'use client'

import { useEffect, useState } from 'react'

const START_DATE = new Date('2025-09-25T00:00:00+08:00')

function calcElapsed() {
  const now = new Date()
  const diff = now.getTime() - START_DATE.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export default function RunningTime() {
  const [elapsed, setElapsed] = useState<ReturnType<typeof calcElapsed> | null>(null)

  useEffect(() => {
    // Keep the server and first client render identical before starting the clock.
    const frame = window.requestAnimationFrame(() => setElapsed(calcElapsed()))
    const timer = setInterval(() => setElapsed(calcElapsed), 1000)
    return () => {
      window.cancelAnimationFrame(frame)
      clearInterval(timer)
    }
  }, [])

  return (
    <span>
      本站已运行 <strong>{elapsed?.days ?? '—'}</strong> 天 <strong>{elapsed ? pad(elapsed.hours) : '—'}</strong> 时{' '}
      <strong>{elapsed ? pad(elapsed.minutes) : '—'}</strong> 分 <strong>{elapsed ? pad(elapsed.seconds) : '—'}</strong> 秒
    </span>
  )
}

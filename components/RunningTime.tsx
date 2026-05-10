'use client'

import { useState, useEffect } from 'react'

const START_DATE = new Date('2016-01-01T00:00:00+08:00')

function calcElapsed() {
  const now = new Date()
  const diff = now.getTime() - START_DATE.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function RunningTime() {
  const [elapsed, setElapsed] = useState(calcElapsed)

  useEffect(() => {
    const timer = setInterval(() => setElapsed(calcElapsed), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span style={{ color: 'var(--color-text-muted)' }}>
      本站已运行{' '}
      <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
        {elapsed.days}
      </span>{' '}
      天{' '}
      <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
        {pad(elapsed.hours)}
      </span>{' '}
      时{' '}
      <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
        {pad(elapsed.minutes)}
      </span>{' '}
      分{' '}
      <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
        {pad(elapsed.seconds)}
      </span>{' '}
      秒
    </span>
  )
}

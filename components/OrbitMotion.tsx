'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import styles from './OrbitHero.module.css'

const TRACKS = Array.from({ length: 11 }, (_, index) => ({
  x: 64 + index * 12,
  y: 28 + index * 11,
  width: 392 - index * 24,
  height: 274 - index * 22,
  radius: Math.max(24, 132 - index * 10),
  phase: -(index * 0.41),
  travel: 13.5 + index * 0.7,
  opacity: 0.34 + index * 0.052,
}))

type TrackStyle = CSSProperties & {
  '--phase': string
  '--travel': string
  '--track-opacity': number
}

export default function OrbitMotion() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let isVisible = true

    const updatePlayback = () => {
      const shouldRun = isVisible && !document.hidden && !motionPreference.matches
      root.dataset.running = String(shouldRun)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
        updatePlayback()
      },
      { threshold: 0.1 },
    )

    observer.observe(root)
    motionPreference.addEventListener('change', updatePlayback)
    document.addEventListener('visibilitychange', updatePlayback)
    updatePlayback()

    return () => {
      observer.disconnect()
      motionPreference.removeEventListener('change', updatePlayback)
      document.removeEventListener('visibilitychange', updatePlayback)
    }
  }, [])

  return (
    <div ref={rootRef} className={styles.motion} data-running="true">
      <svg
        className={styles.art}
        viewBox="0 0 560 330"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="orbit-track" x1="70" y1="285" x2="490" y2="48" gradientUnits="userSpaceOnUse">
            <stop className={styles.stopDeep} />
            <stop offset=".52" className={styles.stopMid} />
            <stop offset="1" className={styles.stopBright} />
          </linearGradient>
          <linearGradient id="orbit-highlight" x1="0" y1="1" x2="1" y2="0">
            <stop stopColor="currentColor" stopOpacity="0" />
            <stop offset=".48" stopColor="currentColor" stopOpacity=".95" />
            <stop offset="1" stopColor="currentColor" stopOpacity=".12" />
          </linearGradient>
          <radialGradient id="orbit-haze">
            <stop className={styles.hazeCenter} />
            <stop offset="1" className={styles.hazeEdge} />
          </radialGradient>
          <pattern id="orbit-grain" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".55" fill="currentColor" />
          </pattern>
          <clipPath id="orbit-grain-crop">
            <rect x="282" y="21" width="236" height="286" rx="118" />
          </clipPath>
        </defs>

        <ellipse className={styles.haze} cx="378" cy="158" rx="170" ry="148" fill="url(#orbit-haze)" />
        <g className={styles.grain} clipPath="url(#orbit-grain-crop)">
          <rect x="276" y="16" width="250" height="298" fill="url(#orbit-grain)" />
        </g>

        <g className={styles.trackBank}>
          {TRACKS.map((track, index) => {
            const trackStyle: TrackStyle = {
              '--phase': `${track.phase}s`,
              '--travel': `${track.travel}s`,
              '--track-opacity': track.opacity,
            }

            return (
              <g className={styles.wave} style={trackStyle} key={index}>
                <rect
                  className={styles.trackLine}
                  x={track.x}
                  y={track.y}
                  width={track.width}
                  height={track.height}
                  rx={track.radius}
                />
                <rect
                  className={styles.trackTrail}
                  x={track.x}
                  y={track.y}
                  width={track.width}
                  height={track.height}
                  rx={track.radius}
                  pathLength="100"
                />
              </g>
            )
          })}
        </g>

        <path
          className={styles.escapeLine}
          d="M68 284 C128 322 188 296 219 249 C259 188 323 235 394 181 C449 139 469 73 526 52"
          pathLength="100"
        />
        <path
          className={styles.escapeTrail}
          d="M68 284 C128 322 188 296 219 249 C259 188 323 235 394 181 C449 139 469 73 526 52"
          pathLength="100"
        />
        <circle className={styles.wanderer} cx="526" cy="52" r="4" />
      </svg>

      <div className={styles.caption}>
        <span>沿着轨道，也走向轨道之外。</span>
      </div>
    </div>
  )
}

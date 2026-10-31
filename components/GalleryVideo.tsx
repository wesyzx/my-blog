'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, SyntheticEvent } from 'react'
import type { GalleryVideo as GalleryVideoMedia } from '@/lib/gallery'

type CropRect = {
  left: number
  top: number
  width: number
  height: number
}

type VideoWithLegacyFullscreen = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  requestVideoFrameCallback?: (callback: (now: number) => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
}

const FULL_FRAME: CropRect = { left: 0, top: 0, width: 1, height: 1 }
const CROP_EPSILON = 0.002

function sameCrop(left: CropRect, right: CropRect) {
  return Math.abs(left.left - right.left) < CROP_EPSILON
    && Math.abs(left.top - right.top) < CROP_EPSILON
    && Math.abs(left.width - right.width) < CROP_EPSILON
    && Math.abs(left.height - right.height) < CROP_EPSILON
}

/**
 * Finds the content rectangle inside an intentionally letterboxed video.
 * Reading a tiny frame is enough: every fully black edge row or column is
 * trimmed, while dark artwork inside the frame stays untouched.
 */
function detectVisibleCrop(video: HTMLVideoElement, canvas: HTMLCanvasElement): CropRect | null {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) return null

  const width = 128
  const height = Math.max(96, Math.round(width * video.videoHeight / video.videoWidth))
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  context.drawImage(video, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height).data
  const rowBlack = new Uint16Array(height)
  const columnBlack = new Uint16Array(width)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const black = pixels[offset] <= 40 && pixels[offset + 1] <= 40 && pixels[offset + 2] <= 40
      if (!black) continue
      rowBlack[y] += 1
      columnBlack[x] += 1
    }
  }

  const rowIsPadding = (y: number) => rowBlack[y] >= width * 0.96
  const columnIsPadding = (x: number) => columnBlack[x] >= height * 0.96
  let top = 0
  let bottom = height
  let left = 0
  let right = width

  while (top < bottom && top < height * 0.46 && rowIsPadding(top)) top += 1
  while (bottom > top && bottom > height * 0.54 && rowIsPadding(bottom - 1)) bottom -= 1
  while (left < right && left < width * 0.46 && columnIsPadding(left)) left += 1
  while (right > left && right > width * 0.54 && columnIsPadding(right - 1)) right -= 1

  // Very small light subjects on a black background are content, not padding.
  if (right - left < width * 0.22 || bottom - top < height * 0.22) return null

  // Keep one sampled pixel inside the content so compression fringes disappear.
  left = Math.max(0, left - 1)
  top = Math.max(0, top - 1)
  right = Math.min(width, right + 1)
  bottom = Math.min(height, bottom + 1)

  const crop = {
    left: left / width,
    top: top / height,
    width: (right - left) / width,
    height: (bottom - top) / height,
  }
  const changed = crop.left + (1 - crop.width) + crop.top + (1 - crop.height)
  return changed > 0.012 ? crop : null
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return '0:00'
  const total = Math.floor(value)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

export default function GalleryVideo({
  media,
  title,
  ordinal,
  onAspectRatio,
}: {
  media: GalleryVideoMedia
  title: string
  ordinal: number
  onAspectRatio: (ratio: number) => void
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<VideoWithLegacyFullscreen>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cropRef = useRef<CropRect>(FULL_FRAME)
  const onAspectRatioRef = useRef(onAspectRatio)
  const lastProgressRef = useRef(0)
  const [crop, setCrop] = useState<CropRect>(FULL_FRAME)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(media.duration || 0)
  const source = `${media.src}${media.src.includes('?') ? '&' : '?'}auto-crop=1`

  useEffect(() => {
    onAspectRatioRef.current = onAspectRatio
  }, [onAspectRatio])

  const reportCrop = useCallback((nextCrop: CropRect) => {
    const video = videoRef.current
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return
    onAspectRatioRef.current((video.videoWidth / video.videoHeight) * nextCrop.width / nextCrop.height)
  }, [])

  const inspectFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
    try {
      const nextCrop = detectVisibleCrop(video, canvas) || FULL_FRAME
      if (sameCrop(cropRef.current, nextCrop)) return
      cropRef.current = nextCrop
      setCrop(nextCrop)
      reportCrop(nextCrop)
    } catch {
      // A host without CORS keeps the normal fixed-frame player as a fallback.
    }
  }, [reportCrop])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const syncLoadedVideo = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : media.duration || 0)
      setCurrentTime(video.currentTime)
      if (video.videoWidth > 0 && video.videoHeight > 0) reportCrop(cropRef.current)
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) inspectFrame()
    }

    // Cached media can reach readyState 4 before React attaches its events.
    syncLoadedVideo()
    video.addEventListener('loadedmetadata', syncLoadedVideo)
    video.addEventListener('loadeddata', syncLoadedVideo)
    video.addEventListener('seeked', syncLoadedVideo)
    return () => {
      video.removeEventListener('loadedmetadata', syncLoadedVideo)
      video.removeEventListener('loadeddata', syncLoadedVideo)
      video.removeEventListener('seeked', syncLoadedVideo)
    }
  }, [inspectFrame, media.duration, reportCrop])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let frameCallback = 0
    let fallbackTimer = 0
    let lastInspection = 0

    const inspectIfNeeded = (time: number) => {
      if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && time - lastInspection >= 700) {
        lastInspection = time
        inspectFrame()
      }
    }
    const tick = (time: number) => {
      if (cancelled) return
      inspectIfNeeded(time)
      if (time - lastProgressRef.current >= 180) {
        lastProgressRef.current = time
        setCurrentTime(video.currentTime)
      }
      if (video.requestVideoFrameCallback) frameCallback = video.requestVideoFrameCallback(tick)
    }

    if (video.requestVideoFrameCallback) {
      frameCallback = video.requestVideoFrameCallback(tick)
    } else {
      fallbackTimer = window.setInterval(() => {
        if (cancelled) return
        inspectIfNeeded(performance.now())
        setCurrentTime(video.currentTime)
      }, 400)
    }

    return () => {
      cancelled = true
      if (frameCallback && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameCallback)
      if (fallbackTimer) window.clearInterval(fallbackTimer)
    }
  }, [inspectFrame])

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === shellRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const syncVideoState = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    setPlaying(!video.paused)
    setMuted(video.muted)
    setDuration(Number.isFinite(video.duration) ? video.duration : media.duration || 0)
    setCurrentTime(video.currentTime)
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return
    reportCrop(cropRef.current)
  }

  const togglePlayback = async () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      try {
        await video.play()
      } catch {
        setPlaying(false)
      }
    } else {
      video.pause()
    }
  }

  const toggleMute = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  const seek = (event: SyntheticEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.currentTime = Number(event.currentTarget.value)
    setCurrentTime(video.currentTime)
  }

  const toggleFullscreen = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const shell = shellRef.current
    const video = videoRef.current
    if (!shell || !video) return
    if (document.fullscreenElement) {
      await document.exitFullscreen?.()
    } else if (shell.requestFullscreen) {
      await shell.requestFullscreen()
    } else {
      video.webkitEnterFullscreen?.()
    }
  }

  const videoStyle = {
    left: `${-100 * crop.left / crop.width}%`,
    top: `${-100 * crop.top / crop.height}%`,
    width: `${100 / crop.width}%`,
    height: `${100 / crop.height}%`,
  } as CSSProperties
  const progress = duration > 0 ? Math.min(currentTime, duration) : 0

  return (
    <div ref={shellRef} className="gallery-video-player">
      <video
        ref={videoRef}
        className="gallery-video-media"
        src={source}
        poster={media.poster}
        crossOrigin="anonymous"
        playsInline
        preload="metadata"
        style={videoStyle}
        aria-label={`${title}，第 ${ordinal} 个视频`}
        onClick={togglePlayback}
        onLoadedMetadata={syncVideoState}
        onPlay={(event) => syncVideoState(event)}
        onPause={(event) => syncVideoState(event)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
      />
      <canvas ref={canvasRef} className="gallery-video-sample" aria-hidden="true" />
      {!playing && (
        <button className="gallery-video-center" type="button" onClick={togglePlayback} aria-label="播放视频">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5Z"/></svg>
        </button>
      )}
      <div className="gallery-video-controls" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={togglePlayback} aria-label={playing ? '暂停' : '播放'}>
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path className="gallery-video-fill" d="m9 7 8 5-8 5Z"/></svg>
          )}
        </button>
        <span className="gallery-video-time">{formatTime(progress)} / {formatTime(duration)}</span>
        <input
          className="gallery-video-progress"
          type="range"
          min="0"
          max={duration || 0}
          step="0.05"
          value={progress}
          onChange={seek}
          aria-label="视频进度"
        />
        <button type="button" onClick={toggleMute} aria-label={muted ? '取消静音' : '静音'}>
          {muted ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5ZM17 9l4 6M21 9l-4 6"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5ZM17 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>
          )}
        </button>
        <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? '退出全屏' : '全屏'}>
          {fullscreen ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v4H4M16 4v4h4M8 20v-4H4M16 20v-4h4"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg>
          )}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, SyntheticEvent } from 'react'
import type { GalleryVideo as GalleryVideoMedia } from '@/lib/gallery'
import { detectVisibleCrop, FULL_FRAME, sameCrop } from '@/lib/video-crop.mjs'
import { videoPreviewTime } from '@/lib/video-preview.mjs'

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
  const backdropCanvasRef = useRef<HTMLCanvasElement>(null)
  const cropRef = useRef<CropRect>(FULL_FRAME)
  const onAspectRatioRef = useRef(onAspectRatio)
  const lastProgressRef = useRef(0)
  const nearViewportRef = useRef(false)
  const previewRequestedRef = useRef(false)
  const previewTimeRef = useRef(0)
  const playbackStartedRef = useRef(false)
  const [crop, setCrop] = useState<CropRect>(FULL_FRAME)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [previewReady, setPreviewReady] = useState(Boolean(media.poster))
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(media.duration || 0)
  const source = `${media.src}${media.src.includes('?') ? '&' : '?'}auto-crop=1`

  useEffect(() => {
    onAspectRatioRef.current = onAspectRatio
  }, [onAspectRatio])

  const reportNaturalRatio = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return
    onAspectRatioRef.current(video.videoWidth / video.videoHeight)
  }, [])

  const drawBackdrop = useCallback(() => {
    const video = videoRef.current
    const canvas = backdropCanvasRef.current
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
    try {
      const width = 96
      const height = Math.max(96, Math.round(width * video.videoHeight / video.videoWidth))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      const crop = cropRef.current
      const sourceX = crop.left * video.videoWidth
      const sourceY = crop.top * video.videoHeight
      const sourceWidth = crop.width * video.videoWidth
      const sourceHeight = crop.height * video.videoHeight
      const scale = Math.max(width / sourceWidth, height / sourceHeight)
      const drawWidth = sourceWidth * scale
      const drawHeight = sourceHeight * scale
      context.clearRect(0, 0, width, height)
      context.drawImage(
        video,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      )
    } catch {
      // The normal cropped foreground remains usable if canvas sampling fails.
    }
  }, [])

  const inspectFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return
    try {
      const width = 128
      const height = Math.max(96, Math.round(width * video.videoHeight / video.videoWidth))
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.drawImage(video, 0, 0, width, height)
      const nextCrop = detectVisibleCrop(context.getImageData(0, 0, width, height).data, width, height) || FULL_FRAME
      if (!sameCrop(cropRef.current, nextCrop)) {
        cropRef.current = nextCrop
        setCrop(nextCrop)
      }
      drawBackdrop()
    } catch {
      // A host without CORS keeps the normal fixed-frame player as a fallback.
    }
  }, [drawBackdrop])

  const primePreview = useCallback(() => {
    const video = videoRef.current
    if (!nearViewportRef.current || !video || media.poster) return

    if (!previewRequestedRef.current) {
      previewRequestedRef.current = true
      video.preload = 'auto'
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
        video.load()
        return
      }
    }

    if (video.readyState < HTMLMediaElement.HAVE_METADATA) return
    const duration = Number.isFinite(video.duration) ? video.duration : media.duration || 0
    const target = videoPreviewTime(duration)
    previewTimeRef.current = target
    if (target > 0 && Math.abs(video.currentTime - target) > 0.1) {
      video.currentTime = target
    } else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      setPreviewReady(true)
    }
  }, [media.duration, media.poster])

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    if (typeof IntersectionObserver === 'undefined') {
      nearViewportRef.current = true
      primePreview()
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      nearViewportRef.current = entry.isIntersecting
      if (entry.isIntersecting) primePreview()
    }, { rootMargin: '240px 0px' })
    observer.observe(shell)
    return () => observer.disconnect()
  }, [primePreview])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const syncLoadedVideo = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : media.duration || 0)
      setCurrentTime(video.currentTime)
      if (video.videoWidth > 0 && video.videoHeight > 0) reportNaturalRatio()
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) inspectFrame()
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) primePreview()
      if (media.poster || (nearViewportRef.current && !playbackStartedRef.current
        && !video.seeking
        && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        && Math.abs(video.currentTime - previewTimeRef.current) <= 0.35)) {
        setPreviewReady(true)
      }
    }

    video.addEventListener('loadedmetadata', syncLoadedVideo)
    video.addEventListener('loadeddata', syncLoadedVideo)
    video.addEventListener('seeked', syncLoadedVideo)
    // Cached media can reach readyState 4 before React attaches its events.
    syncLoadedVideo()
    return () => {
      video.removeEventListener('loadedmetadata', syncLoadedVideo)
      video.removeEventListener('loadeddata', syncLoadedVideo)
      video.removeEventListener('seeked', syncLoadedVideo)
    }
  }, [inspectFrame, media.duration, media.poster, primePreview, reportNaturalRatio])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let frameCallback = 0
    let fallbackTimer = 0
    let lastInspection = 0
    let lastBackdrop = 0

    const updateFrameIfNeeded = (time: number) => {
      if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && time - lastInspection >= 700) {
        lastInspection = time
        inspectFrame()
      }
      if (!video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && time - lastBackdrop >= 160) {
        lastBackdrop = time
        drawBackdrop()
      }
    }
    const tick = (time: number) => {
      if (cancelled) return
      updateFrameIfNeeded(time)
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
        updateFrameIfNeeded(performance.now())
        setCurrentTime(video.currentTime)
      }, 400)
    }

    return () => {
      cancelled = true
      if (frameCallback && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(frameCallback)
      if (fallbackTimer) window.clearInterval(fallbackTimer)
    }
  }, [drawBackdrop, inspectFrame])

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === shellRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const syncVideoState = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    setPlaying(!video.paused)
    if (!video.paused) setPreviewReady(true)
    setMuted(video.muted)
    setDuration(Number.isFinite(video.duration) ? video.duration : media.duration || 0)
    setCurrentTime(video.currentTime)
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return
    reportNaturalRatio()
  }

  const togglePlayback = async () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      if (!playbackStartedRef.current) {
        playbackStartedRef.current = true
        video.currentTime = 0
      }
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

  const scale = 100 / Math.max(crop.width, crop.height)
  const videoStyle = {
    left: `${50 - (crop.left + crop.width / 2) * scale}%`,
    top: `${50 - (crop.top + crop.height / 2) * scale}%`,
    width: `${scale}%`,
    height: `${scale}%`,
    clipPath: `inset(${crop.top * 100}% ${(1 - crop.left - crop.width) * 100}% ${(1 - crop.top - crop.height) * 100}% ${crop.left * 100}%)`,
  } as CSSProperties
  const progress = duration > 0 ? Math.min(currentTime, duration) : 0

  return (
    <div
      ref={shellRef}
      className={`gallery-video-player${previewReady ? ' is-preview-ready' : ''}`}
    >
      <canvas ref={backdropCanvasRef} className="gallery-video-backdrop" aria-hidden="true" />
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

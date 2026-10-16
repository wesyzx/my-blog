'use client'

import { useEffect, useRef, useState } from 'react'
import type PhotoSwipe from 'photoswipe'

let viewerModule: Promise<typeof import('./photoSwipe')> | undefined

function loadViewer() {
  viewerModule ??= import('./photoSwipe').catch((error) => {
    viewerModule = undefined
    throw error
  })
  return viewerModule
}

function canOpen(image: HTMLImageElement) {
  if (image.closest('[data-lightbox="off"]')) return false
  const link = image.closest('a')
  if (!link) return true
  return link.href === image.src
    || link.getAttribute('href') === image.dataset.lightboxSrc
    || /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(link.href)
}

export default function ImageLightbox({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let opening = false
    let viewer: PhotoSwipe | undefined
    const restorations = new Map<HTMLImageElement, () => void>()
    const images = () => Array.from(host.querySelectorAll<HTMLImageElement>('img'))
      .filter((image) => image.closest('[data-image-lightbox]') === host && canOpen(image))

    const enhance = () => {
      const currentImages = new Set(images())
      restorations.forEach((restore, image) => {
        if (!currentImages.has(image)) {
          restore()
          restorations.delete(image)
        }
      })
      currentImages.forEach((image) => {
        if (restorations.has(image)) return
        const attributes: Record<string, string> = image.closest('a')
          ? { 'data-lightbox-trigger': '' }
          : {
              'data-lightbox-trigger': '',
              tabindex: '0',
              role: 'button',
              'aria-haspopup': 'dialog',
              'aria-label': `放大图片${image.alt ? `：${image.alt}` : ''}`,
            }
        const previous = Object.keys(attributes).map((name) => [name, image.getAttribute(name)] as const)
        Object.entries(attributes).forEach(([name, value]) => image.setAttribute(name, value))
        restorations.set(image, () => previous.forEach(([name, value]) => {
          if (value === null) image.removeAttribute(name)
          else image.setAttribute(name, value)
        }))
      })
    }

    const findImage = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return
      const image = target instanceof HTMLImageElement ? target : target.closest('a')?.querySelector('img')
      return image && images().includes(image) ? image : undefined
    }

    const open = async (image: HTMLImageElement) => {
      if (opening || viewer || document.querySelector('.pswp')) return
      opening = true
      setError('')
      image.setAttribute('aria-busy', 'true')
      try {
        const { openPhotoSwipe } = await loadViewer()
        if (disposed || !host.contains(image) || document.querySelector('.pswp')) return
        const currentImages = images()
        const index = currentImages.indexOf(image)
        if (index < 0) return
        ;(image.closest('a') || image).focus({ preventScroll: true })
        viewer = openPhotoSwipe(currentImages, index)
        viewer.on('destroy', () => { viewer = undefined })
      } catch {
        if (!disposed) setError('图片查看器加载失败，请再次点击图片重试。')
      } finally {
        opening = false
        image.removeAttribute('aria-busy')
      }
    }

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const image = findImage(event.target)
      if (!image) return
      event.preventDefault()
      event.stopPropagation()
      void open(image)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const image = findImage(event.target)
      if (!image || image.closest('a')) return
      event.preventDefault()
      event.stopPropagation()
      void open(image)
    }
    const prepare = (event: Event) => {
      if (findImage(event.target)) void loadViewer().catch(() => {})
    }

    enhance()
    const observer = new MutationObserver(enhance)
    observer.observe(host, { childList: true, subtree: true })
    host.addEventListener('click', onClick)
    host.addEventListener('keydown', onKeyDown)
    host.addEventListener('pointerover', prepare)
    host.addEventListener('focusin', prepare)
    return () => {
      disposed = true
      observer.disconnect()
      host.removeEventListener('click', onClick)
      host.removeEventListener('keydown', onKeyDown)
      host.removeEventListener('pointerover', prepare)
      host.removeEventListener('focusin', prepare)
      restorations.forEach((restore) => restore())
      const activeViewer = viewer
      if (activeViewer?.opener.isOpening) {
        activeViewer.on('openingAnimationEnd', () => activeViewer.destroy())
      } else {
        activeViewer?.destroy()
      }
    }
  }, [])

  return (
    <div ref={hostRef} className={className} data-image-lightbox="">
      {children}
      {error && <p role="status">{error}</p>}
    </div>
  )
}

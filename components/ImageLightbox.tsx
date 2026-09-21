'use client'

import { useEffect, useRef, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'

type Slide = { src: string; alt?: string }

/**
 * 取图片的最大可用地址。
 *
 * next/image 渲染出来的 <img> 的 src 只是当前显示尺寸的优化地址，
 * 直接拿去开灯箱会糊；优先读 srcset 里宽度最大的一档。
 * 想指定别的地址（比如原图）可以在图片上写 data-lightbox-src。
 */
function largestSrc(img: HTMLImageElement): string {
  const explicit = img.dataset.lightboxSrc
  if (explicit) return explicit

  const srcset = img.getAttribute('srcset')
  if (srcset) {
    let best = ''
    let bestWidth = -1
    for (const part of srcset.split(',')) {
      const [url, descriptor] = part.trim().split(/\s+/)
      if (!url) continue
      const width = descriptor?.endsWith('w') ? Number.parseInt(descriptor, 10) : 0
      if (width > bestWidth) {
        bestWidth = width
        best = url
      }
    }
    if (best) return best
  }

  return img.currentSrc || img.src
}

/**
 * 给容器里的所有图片挂上灯箱。
 *
 * 挂载后扫描一次容器内的 <img>，点击任意一张就打开 yet-another-react-lightbox，
 * 支持左右切换、缩放和全屏。图片原本包在 <a> 里的（短记的多图就是）
 * 会拦掉默认跳转，改成开灯箱。
 *
 * 用「扫描 DOM」而不是给每张图传 props，是为了同一套逻辑能同时覆盖
 * 文章正文（MDX 渲染出来的裸 <img>）和短记多图（next/image）两种来源。
 */
export default function ImageLightbox({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [index, setIndex] = useState(-1)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const images = Array.from(host.querySelectorAll<HTMLImageElement>('img'))
    if (images.length === 0) return

    setSlides(images.map((img) => ({ src: largestSrc(img), alt: img.alt || undefined })))

    const cleanups: Array<() => void> = []
    images.forEach((img, i) => {
      const onClick = (event: MouseEvent) => {
        // 短记的多图外面套了 <a target="_blank">，这里拦掉，别跳去原图
        if (img.closest('a')) event.preventDefault()
        event.stopPropagation()
        setIndex(i)
      }
      img.addEventListener('click', onClick)
      const previousCursor = img.style.cursor
      img.style.cursor = 'zoom-in'
      cleanups.push(() => {
        img.removeEventListener('click', onClick)
        img.style.cursor = previousCursor
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return (
    <>
      <div ref={hostRef} className={className}>{children}</div>
      <Lightbox
        open={index >= 0}
        index={index < 0 ? 0 : index}
        close={() => setIndex(-1)}
        slides={slides}
        plugins={[Fullscreen, Zoom]}
        controller={{ closeOnBackdropClick: true }}
      />
    </>
  )
}

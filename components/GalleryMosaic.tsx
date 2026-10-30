'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import BlogImage from './BlogImage'
import ImageLightbox from './ImageLightbox'
import { blogImageUrl } from '@/lib/blog-images.mjs'
import type { GalleryMedia } from '@/lib/gallery'

/** The last row fills its width; desktop and phone use four and two columns. */
export default function GalleryMosaic({ images, title }: { images: GalleryMedia[]; title: string }) {
  const imageCount = images.filter((media) => media.kind !== 'video').length
  const [videoRatios, setVideoRatios] = useState<Record<string, number>>({})
  const mediaKey = (media: GalleryMedia, index: number) => `${media.src}-${index}`
  const mediaRatio = (media: GalleryMedia, index: number) => (
    videoRatios[mediaKey(media, index)] || media.width / media.height
  )

  return (
    <ImageLightbox className="gallery-mosaic">
      {images.map((media, index) => {
        const desktopStart = Math.floor(index / 4) * 4
        const mobileStart = Math.floor(index / 2) * 2
        const desktopCount = Math.min(4, images.length - desktopStart)
        const mobileCount = Math.min(2, images.length - mobileStart)
        const ratio = mediaRatio(media, index)
        const desktopRatios = images.slice(desktopStart, desktopStart + desktopCount)
          .reduce((sum, item, offset) => sum + mediaRatio(item, desktopStart + offset), 0)
        const mobileRatios = images.slice(mobileStart, mobileStart + mobileCount)
          .reduce((sum, item, offset) => sum + mediaRatio(item, mobileStart + offset), 0)
        const style = {
          '--photo-width': `calc((100% - ${(desktopCount - 1) * 6}px) * ${ratio / desktopRatios})`,
          '--mobile-photo-width': `calc((100% - ${(mobileCount - 1) * 4}px) * ${ratio / mobileRatios})`,
          '--photo-ratio': String(ratio),
        } as CSSProperties

        if (media.kind === 'video') {
          return (
            <div
              key={`${media.src}-${index}`}
              className={`gallery-mosaic-photo gallery-mosaic-video${ratio < 1 ? ' gallery-mosaic-portrait-video' : ''}`}
              style={style}
            >
              <video
                src={media.src}
                poster={media.poster}
                controls
                playsInline
                preload="metadata"
                aria-label={`${title}，第 ${index + 1} 个视频`}
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget
                  if (video.videoWidth <= 0 || video.videoHeight <= 0) return
                  const ratio = video.videoWidth / video.videoHeight
                  const key = mediaKey(media, index)
                  setVideoRatios((current) => (
                    Math.abs((current[key] || media.width / media.height) - ratio) < 0.001
                      ? current
                      : { ...current, [key]: ratio }
                  ))
                }}
              />
            </div>
          )
        }

        const imageOrdinal = images.slice(0, index + 1)
          .filter((item) => item.kind !== 'video').length
        return (
          <a
            key={`${media.src}-${index}`}
            className="gallery-mosaic-photo"
            style={style}
            href={blogImageUrl(media.src, { preset: 'full' })}
            aria-label={`放大照片：${title}，第 ${imageOrdinal} 张`}
            aria-haspopup="dialog"
          >
            <BlogImage
              src={media.src}
              preset="fit"
              alt={`${title}，第 ${imageOrdinal} 张`}
              fill
              sizes={`(max-width: 560px) ${Math.ceil(100 * ratio / mobileRatios)}vw, (max-width: 1216px) ${Math.ceil(100 * ratio / desktopRatios)}vw, ${Math.ceil(1120 * ratio / desktopRatios)}px`}
              data-lightbox-src={blogImageUrl(media.src, { preset: 'full' })}
              data-lightbox-caption={`${imageOrdinal}/${imageCount}`}
              data-pswp-width={media.width}
              data-pswp-height={media.height}
            />
          </a>
        )
      })}
    </ImageLightbox>
  )
}

import type { CSSProperties } from 'react'
import BlogImage from './BlogImage'
import ImageLightbox from './ImageLightbox'
import { blogImageUrl } from '@/lib/blog-images.mjs'

type Photo = { src: string; width: number; height: number }

/** The last row fills its width; desktop and phone use four and two columns. */
export default function GalleryMosaic({ images, title }: { images: Photo[]; title: string }) {
  return (
    <ImageLightbox className="gallery-mosaic">
      {images.map((image, index) => {
        const desktopStart = Math.floor(index / 4) * 4
        const mobileStart = Math.floor(index / 2) * 2
        const desktopCount = Math.min(4, images.length - desktopStart)
        const mobileCount = Math.min(2, images.length - mobileStart)
        const ratio = image.width / image.height
        const desktopRatios = images.slice(desktopStart, desktopStart + desktopCount)
          .reduce((sum, photo) => sum + photo.width / photo.height, 0)
        const mobileRatios = images.slice(mobileStart, mobileStart + mobileCount)
          .reduce((sum, photo) => sum + photo.width / photo.height, 0)
        const style = {
          '--photo-width': `calc((100% - ${(desktopCount - 1) * 6}px) * ${ratio / desktopRatios})`,
          '--mobile-photo-width': `calc((100% - ${(mobileCount - 1) * 4}px) * ${ratio / mobileRatios})`,
          '--photo-ratio': `${image.width} / ${image.height}`,
        } as CSSProperties
        return (
          <a
            key={`${image.src}-${index}`}
            className="gallery-mosaic-photo"
            style={style}
            href={blogImageUrl(image.src, { preset: 'full' })}
            aria-label={`放大照片：${title}，第 ${index + 1} 张`}
            aria-haspopup="dialog"
          >
            <BlogImage
              src={image.src}
              preset="fit"
              alt={`${title}，第 ${index + 1} 张`}
              fill
              sizes={`(max-width: 560px) ${Math.ceil(100 * ratio / mobileRatios)}vw, (max-width: 1216px) ${Math.ceil(100 * ratio / desktopRatios)}vw, ${Math.ceil(1120 * ratio / desktopRatios)}px`}
              data-lightbox-src={blogImageUrl(image.src, { preset: 'full' })}
              data-lightbox-caption={`${index + 1}/${images.length}`}
              data-pswp-width={image.width}
              data-pswp-height={image.height}
            />
          </a>
        )
      })}
    </ImageLightbox>
  )
}

'use client'

import Image, { type ImageLoaderProps, type ImageProps } from 'next/image'
import { blogImageCropDisabled, blogImageUrl, isBlogImage, type BlogImageFocus, type BlogImagePreset } from '@/lib/blog-images.mjs'

type BlogImageProps = Omit<ImageProps, 'loader'> & {
  preset?: BlogImagePreset
  focus?: BlogImageFocus
  'data-lightbox-src'?: string
}

/** Keep the loader on the client side of the RSC boundary, scoped to owned images. */
export default function BlogImage({ src, alt, preset = 'fit', focus = 'auto', unoptimized = false, ...props }: BlogImageProps) {
  if (typeof src !== 'string' || !isBlogImage(src)) return <Image src={src} alt={alt} unoptimized={unoptimized} {...props} />

  const loader = ({ src: source, width }: ImageLoaderProps) => blogImageUrl(source, { preset, width, focus })
  const lightboxSource = props['data-lightbox-src']
  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      // A custom loader already produces a bounded Worker URL; bypassing it in
      // development would silently render the old image host instead.
      loader={loader}
      unoptimized={false}
      style={blogImageCropDisabled(src) ? { ...props.style, objectFit: 'contain' } : props.style}
      data-lightbox-src={lightboxSource ? blogImageUrl(lightboxSource, { preset: 'full' }) : undefined}
    />
  )
}

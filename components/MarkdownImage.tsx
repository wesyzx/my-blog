import { getImageProps } from 'next/image'
import { BLOG_IMAGE_WIDTHS, blogImageUrl, isBlogImage } from '@/lib/blog-images.mjs'
import type { ComponentProps } from 'react'

type MarkdownImageProps = ComponentProps<'img'> & { 'data-lightbox-src'?: string }

export default function MarkdownImage({ src, alt = '', ...props }: MarkdownImageProps) {
  let preview: Partial<ComponentProps<'img'>> = {}
  if (typeof src === 'string' && isBlogImage(src) && !props.srcSet) {
    preview = {
      src: blogImageUrl(src, { preset: 'fit' }),
      srcSet: BLOG_IMAGE_WIDTHS.map((width) => `${blogImageUrl(src, { preset: 'fit', width })} ${width}w`).join(', '),
      sizes: props.sizes || '(max-width: 860px) calc(100vw - 40px), (max-width: 976px) calc(100vw - 48px), 880px',
    }
  } else if (typeof src === 'string' && URL.canParse(src, 'https://guanyan.me')) {
    const url = new URL(src, 'https://guanyan.me')
    if (url.protocol === 'https:' && url.hostname.endsWith('.guanyan.me') && !props.srcSet) {
      const { props: optimized } = getImageProps({
        src,
        alt,
        width: Number(props.width) || 1600,
        height: Number(props.height) || 1000,
        sizes: props.sizes || '(max-width: 860px) calc(100vw - 40px), (max-width: 976px) calc(100vw - 48px), 880px',
      })
      preview = { src: optimized.src, srcSet: optimized.srcSet, sizes: optimized.sizes }
    }
  }

  const lightboxSource = props['data-lightbox-src'] || (preview.src && typeof src === 'string' ? src : undefined)

  // Keep historical images' intrinsic layout: only responsive URLs are swapped here.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      loading="lazy"
      decoding="async"
      {...props}
      src={src}
      alt={alt}
      {...preview}
      data-lightbox-src={typeof lightboxSource === 'string' ? blogImageUrl(lightboxSource, { preset: 'full' }) : undefined}
    />
  )
}

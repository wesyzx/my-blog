import { getImageProps } from 'next/image'
import type { ComponentProps } from 'react'

type MarkdownImageProps = ComponentProps<'img'> & { 'data-lightbox-src'?: string }

export default function MarkdownImage({ src, alt = '', ...props }: MarkdownImageProps) {
  let preview: Partial<ComponentProps<'img'>> = {}
  if (typeof src === 'string' && URL.canParse(src, 'https://guanyan.me')) {
    const url = new URL(src, 'https://guanyan.me')
    if (url.protocol === 'https:' && url.hostname.endsWith('.guanyan.me') && !props.srcSet) {
      const { props: optimized } = getImageProps({
        src,
        alt,
        width: Number(props.width) || 1600,
        height: Number(props.height) || 1000,
        sizes: props.sizes || '(max-width: 860px) calc(100vw - 40px), 680px',
      })
      preview = { src: optimized.src, srcSet: optimized.srcSet, sizes: optimized.sizes }
    }
  }
  // Keep historical images' intrinsic layout: only Next's responsive URLs are needed here.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      loading="lazy"
      decoding="async"
      {...props}
      src={src}
      alt={alt}
      {...preview}
      data-lightbox-src={props['data-lightbox-src'] || (preview.src && typeof src === 'string' ? src : undefined)}
    />
  )
}

import BlogImage from '@/components/BlogImage'
import { blogImageUrl } from '@/lib/blog-images.mjs'
import ImageLightbox from '@/components/ImageLightbox'

export default function ContentImage({
  src,
  alt,
  fit = 'contain',
}: {
  src: string
  alt: string
  fit?: 'contain' | 'cover'
}) {
  return (
    <ImageLightbox className={`content-image content-image-${fit}`}>
      <a href={blogImageUrl(src, { preset: 'full' })} className="content-image-link" aria-label={`放大图片：${alt}`} aria-haspopup="dialog">
        <BlogImage
          preset={fit === 'cover' ? 'content' : 'fit'}
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 720px) calc(100vw - 40px), 680px"
          unoptimized={process.env.NODE_ENV === 'development'}
          data-lightbox-src={blogImageUrl(src, { preset: 'full' })}
        />
      </a>
    </ImageLightbox>
  )
}

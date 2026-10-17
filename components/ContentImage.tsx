import Image from 'next/image'
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
      <a href={src} className="content-image-link" aria-label={`放大图片：${alt}`} aria-haspopup="dialog">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 720px) calc(100vw - 40px), 680px"
          unoptimized={process.env.NODE_ENV === 'development'}
          data-lightbox-src={src}
        />
      </a>
    </ImageLightbox>
  )
}

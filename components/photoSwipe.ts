import PhotoSwipe, { type SlideData } from 'photoswipe'
import 'photoswipe/style.css'
import './photoSwipe.css'

function originalSource(image: HTMLImageElement) {
  if (image.dataset.lightboxSrc) return image.dataset.lightboxSrc
  const source = image.getAttribute('src') || image.currentSrc
  const url = new URL(source, document.baseURI)
  // Recover the existing R2/EdgeOne URL without removing signed or processing parameters.
  if (url.origin === location.origin && url.pathname === '/_next/image') {
    return url.searchParams.get('url') || source
  }
  const link = image.closest('a')
  if (link) return link.href
  const candidates = (image.getAttribute('srcset') || '').split(',')
    .map((candidate) => {
      const [src, descriptor = ''] = candidate.trim().split(/\s+/)
      return { src, size: Number.parseFloat(descriptor) || 0 }
    })
    .sort((a, b) => b.size - a.size)
  return candidates[0]?.src || source
}

function slideData(image: HTMLImageElement): SlideData {
  const width = Number(image.dataset.pswpWidth) || image.naturalWidth || image.width || 1200
  const height = Number(image.dataset.pswpHeight) || image.naturalHeight || image.height || 800
  return {
    src: originalSource(image),
    msrc: image.currentSrc || image.src,
    width,
    height,
    element: image,
    alt: image.alt,
    caption: image.closest('figure')?.querySelector('figcaption')?.textContent?.trim()
      || image.title || image.alt,
    thumbCropped: getComputedStyle(image).objectFit === 'cover',
  }
}

export function openPhotoSwipe(images: HTMLImageElement[], index: number) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const viewer = new PhotoSwipe({
    dataSource: images.map(slideData),
    index,
    mainClass: 'blog-lightbox',
    bgOpacity: 0.94,
    preload: [1, 1],
    loop: false,
    showHideAnimationType: reducedMotion ? 'none' : 'zoom',
    showAnimationDuration: 280,
    hideAnimationDuration: 240,
    paddingFn: (viewport) => ({
      top: 48,
      bottom: 64,
      left: viewport.x < 600 ? 12 : 48,
      right: viewport.x < 600 ? 12 : 48,
    }),
    closeTitle: '关闭图片',
    zoomTitle: '放大或缩小',
    arrowPrevTitle: '上一张',
    arrowNextTitle: '下一张',
    errorMsg: '图片加载失败，请关闭后重试。',
    indexIndicatorSep: ' / ',
  })

  // Historical Markdown and next/image thumbnails may not expose original dimensions.
  // Correct them from the same on-demand image request, including cached adjacent slides.
  const updateSize = (content: NonNullable<PhotoSwipe['currSlide']>['content']) => {
    const image = content.element
    if (!(image instanceof HTMLImageElement) || !image.naturalWidth) return
    if (content.width === image.naturalWidth && content.height === image.naturalHeight) return
    content.data.width = content.width = image.naturalWidth
    content.data.height = content.height = image.naturalHeight
    const resize = () => {
      const slide = content.slide
      if (!slide || !viewer.element?.isConnected || viewer.isDestroying) return
      slide.width = content.width
      slide.height = content.height
      slide.resize()
    }
    if (viewer.opener.isOpening) viewer.on('openingAnimationEnd', resize)
    else requestAnimationFrame(resize)
  }
  viewer.on('loadComplete', ({ content, isError }) => {
    if (!isError) updateSize(content)
  })
  viewer.on('contentAppend', ({ content }) => updateSize(content))
  viewer.on('initialLayout', () => {
    viewer.element?.setAttribute('aria-modal', 'true')
    viewer.element?.setAttribute('aria-label', '图片查看器')
  })
  viewer.on('uiRegister', () => {
    viewer.ui?.registerElement({
      name: 'caption',
      order: 9,
      isButton: false,
      appendTo: 'root',
      onInit: (element) => {
        element.setAttribute('aria-live', 'polite')
        element.setAttribute('aria-atomic', 'true')
        const update = () => {
          const caption = viewer.currSlide?.data.caption || ''
          element.textContent = caption
          element.hidden = !caption
        }
        viewer.on('change', update)
        update()
      },
    })
  })
  viewer.init()
  return viewer
}

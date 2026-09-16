import type { Metadata } from 'next'

export const SITE_NAME = '轨道之外'
export const SITE_URL = 'https://guanyan.me'

interface PageMetadataOptions {
  title: string
  description: string
  path: string
  images?: string[]
}

export function createPageMetadata({ title, description, path, images = [] }: PageMetadataOptions): Metadata {
  const url = new URL(path, SITE_URL).toString()
  const socialImages = images.length > 0 ? images : undefined

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'zh_CN',
      type: 'website',
      images: socialImages,
    },
    twitter: {
      card: socialImages ? 'summary_large_image' : 'summary',
      title,
      description,
      images: socialImages,
    },
  }
}

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'img.guanyan.me',
      },
      {
        protocol: 'https',
        hostname: 'img.215320.xyz',
      },
    ],
  },
}

export default nextConfig
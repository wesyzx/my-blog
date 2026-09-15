import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.guanyan.me',
      },
      {
        protocol: 'http',
        hostname: '**.guanyan.me',
      },
      {
        protocol: 'https',
        hostname: 'img.215320.xyz',
      },
    ],
  },
  output: 'standalone',
}

export default nextConfig

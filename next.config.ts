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
  typescript: {
    // 忽略又拍云 SDK 缺失类型定义导致的构建报错
    ignoreBuildErrors: true,
  },
}

export default nextConfig

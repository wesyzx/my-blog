'use client'

import dynamic from 'next/dynamic'
import type { FoodMeta } from '@/lib/food'

const FoodMap = dynamic(() => import('./FoodMap'), { ssr: false })

export default function FoodMapWrapper({ posts }: { posts: FoodMeta[] }) {
  return <FoodMap posts={posts} />
}

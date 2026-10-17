import 'server-only'
import { cache } from 'react'
import { emptyWorkoutsData, normalizeWorkoutsData, type WorkoutsDataContract } from '@/lib/workouts-schema'

export const getWorkoutsData = cache(async (): Promise<WorkoutsDataContract> => {
  const url = process.env.WORKOUTS_API_URL
  if (!url) {
    console.warn('WORKOUTS_API_URL is not set, returning empty data')
    return emptyWorkoutsData()
  }

  try {
    // Refresh frequently enough for a newly uploaded workout to appear promptly.
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) {
      console.warn(`Failed to fetch workouts data: ${res.status} ${res.statusText}`)
      return emptyWorkoutsData()
    }
    const data = normalizeWorkoutsData(await res.json())
    if (!data) {
      console.warn('Invalid workouts data contract')
      return emptyWorkoutsData()
    }
    return data
  } catch (error) {
    console.warn('Error fetching workouts data:', error)
    return emptyWorkoutsData()
  }
})

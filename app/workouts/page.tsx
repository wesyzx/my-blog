import { getWorkoutsData } from '@/lib/workouts'
import { createPageMetadata } from '@/lib/metadata'
import WorkoutLiveContent from '@/components/WorkoutLiveContent'
import PageHeader from '@/components/PageHeader'

// Workout data is written independently by the HealthKit sync flow. Render this
// route at request time so a build cannot freeze an empty snapshot into HTML.
export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: '运动',
  description: '跑步、骑行与日常运动记录。',
  path: '/workouts',
})

export default async function WorkoutsPage() {
  const data = await getWorkoutsData()

  return (
    <div className="page-shell narrow animate-fade-up">
      <PageHeader title="运动" />
      <WorkoutLiveContent initialData={data} />
    </div>
  )
}

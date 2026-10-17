const WORKOUTS_ROUTES_URL = 'https://workouts.wesyzx.workers.dev/v1/routes.json'

/**
 * The workouts snapshot only keeps the latest 50 activities. The routes
 * snapshot is the complete, public set of activities whose owner explicitly
 * chose to publish a track.
 */
export function workoutRoutesUrl(workoutsUrl = process.env.WORKOUTS_API_URL) {
  return process.env.WORKOUTS_ROUTES_API_URL
    || workoutsUrl?.replace(/workouts\.json(?:\?.*)?$/, 'routes.json')
    || WORKOUTS_ROUTES_URL
}

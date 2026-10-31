const PREVIEW_FRACTION = 0.2
const MAX_PREVIEW_SECONDS = 5
const MIN_PREVIEW_SECONDS = 0.25

/**
 * Pick a representative preview frame without relying on the first frame,
 * which is often an autofocus or fade-in image in phone videos.
 */
export function videoPreviewTime(duration) {
  if (!Number.isFinite(duration) || duration <= 0) return 0
  if (duration <= 1) return duration / 2
  return Math.min(
    duration - 0.05,
    MAX_PREVIEW_SECONDS,
    Math.max(MIN_PREVIEW_SECONDS, duration * PREVIEW_FRACTION),
  )
}

/**
 * Next.js route params arrive percent-encoded. Decode once so Unicode slugs
 * match the snapshot, while malformed input remains an ordinary 404 candidate.
 */
export function decodeRouteSlug(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

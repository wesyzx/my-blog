/**
 * Keep scrubbing separate from media seeks. A drag issues one seek at release,
 * and requests playback in that user gesture so Safari can resume with audio.
 */
export function createVideoSeekController(video) {
  let scrubbing = false
  let wasPlaying = false
  let resumePending = false

  const resume = () => {
    if (resumePending && !scrubbing) {
      // A new seek can abort an older play promise. Keep the intent until
      // actual playback starts, and retry at seeked/canplay if Safari paused.
      try { video.play()?.catch(() => {}) } catch { /* Keep the play button usable. */ }
    }
  }
  const recover = () => {
    if (video.paused && !video.seeking && video.readyState >= 3) resume()
  }
  const playing = () => {
    if (!scrubbing && !video.seeking) resumePending = false
  }
  const ended = () => { resumePending = false }
  video.addEventListener('seeked', recover)
  video.addEventListener('canplay', recover)
  video.addEventListener('playing', playing)
  video.addEventListener('ended', ended)

  return {
    get scrubbing() { return scrubbing },
    begin() {
      if (scrubbing) return
      wasPlaying = resumePending || (!video.paused && !video.ended)
      scrubbing = true
      video.pause()
    },
    commit(value) {
      const duration = video.duration
      if (!Number.isFinite(value) || !Number.isFinite(duration) || duration <= 0) {
        if (scrubbing) {
          scrubbing = false
          resumePending = wasPlaying
          resume()
        }
        return
      }
      const shouldResume = scrubbing ? wasPlaying : resumePending || (!video.paused && !video.ended)
      scrubbing = false
      resumePending = shouldResume
      const target = Math.max(0, Math.min(value, duration))
      video.currentTime = target
      resume()
      return target
    },
    cancel() {
      if (!scrubbing) return
      scrubbing = false
      resumePending = wasPlaying
      resume()
    },
    cancelResume() {
      scrubbing = false
      resumePending = false
    },
    destroy() {
      scrubbing = false
      resumePending = false
      video.removeEventListener('seeked', recover)
      video.removeEventListener('canplay', recover)
      video.removeEventListener('playing', playing)
      video.removeEventListener('ended', ended)
    },
  }
}

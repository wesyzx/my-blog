const players = new Set()

export function createVideoAudioController(video, { onMutedChange, onDeactivate }) {
  let muted = video.muted || video.volume === 0
  let lastNativeMuted = video.muted
  let audibleVolume = video.volume > 0 ? video.volume : 1

  const setVolume = (value) => {
    // iOS may leave volume under hardware control; native muted still applies.
    try { video.volume = value } catch { /* Keep the native mute switch available. */ }
  }
  const sync = () => {
    // Native fullscreen controls can unmute without restoring the zero volume
    // used by our button. Restore the previous audible level in that case.
    if (muted && lastNativeMuted && !video.muted && video.volume === 0) setVolume(audibleVolume)
    muted = video.muted || video.volume === 0
    lastNativeMuted = video.muted
    if (video.defaultMuted !== muted) video.defaultMuted = muted
    if (!muted && video.volume > 0) audibleVolume = video.volume
    onMutedChange(muted)
    return muted
  }
  const setMuted = (next) => {
    if (next && !video.muted && video.volume > 0) audibleVolume = video.volume
    muted = next
    video.defaultMuted = next
    video.muted = next
    lastNativeMuted = next
    setVolume(next ? 0 : audibleVolume)
    return sync()
  }
  const player = {
    stop() {
      onDeactivate()
      video.pause()
    },
  }
  const activate = () => {
    for (const other of players) {
      if (other !== player) other.stop()
    }
    setMuted(muted)
  }
  players.add(player)
  video.addEventListener('play', activate)
  video.addEventListener('volumechange', sync)

  return {
    sync,
    toggleMuted() { return setMuted(!muted) },
    destroy() {
      players.delete(player)
      video.removeEventListener('play', activate)
      video.removeEventListener('volumechange', sync)
      player.stop()
      video.removeAttribute('src')
      video.load()
    },
  }
}

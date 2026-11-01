import assert from 'node:assert/strict'
import test from 'node:test'
import { createVideoSeekController } from '../lib/video-seek.mjs'

class Video extends EventTarget {
  paused = false
  ended = false
  seeking = false
  readyState = 4
  duration = 120
  currentTime = 10
  playCalls = 0
  pause() { this.paused = true }
  play() {
    this.playCalls += 1
    this.paused = false
    return Promise.resolve()
  }
}

test('a drag pauses playback and commits one final seek before resuming', () => {
  const video = new Video()
  const seek = createVideoSeekController(video)
  seek.begin()
  seek.begin()
  assert.equal(seek.scrubbing, true)
  assert.equal(video.paused, true)
  assert.equal(video.currentTime, 10)
  assert.equal(video.playCalls, 0)
  assert.equal(seek.commit(85), 85)
  assert.equal(seek.scrubbing, false)
  assert.equal(video.currentTime, 85)
  assert.equal(video.playCalls, 1)
  assert.equal(video.paused, false)
  seek.destroy()
})

test('a paused video remains paused after scrubbing', () => {
  const video = new Video()
  video.paused = true
  const seek = createVideoSeekController(video)
  seek.begin()
  seek.commit(60)
  video.dispatchEvent(new Event('seeked'))
  video.dispatchEvent(new Event('canplay'))
  assert.equal(video.currentTime, 60)
  assert.equal(video.paused, true)
  assert.equal(video.playCalls, 0)
  seek.destroy()
})

test('an interrupted play request recovers when the seeked frame is ready', () => {
  const video = new Video()
  video.play = () => {
    video.playCalls += 1
    if (video.playCalls === 1) return Promise.reject(new DOMException('Interrupted seek', 'AbortError'))
    video.paused = false
    return Promise.resolve()
  }
  const seek = createVideoSeekController(video)
  seek.begin()
  seek.commit(80)
  assert.equal(video.playCalls, 1)
  video.seeking = true
  video.dispatchEvent(new Event('canplay'))
  assert.equal(video.playCalls, 1)
  video.seeking = false
  video.dispatchEvent(new Event('seeked'))
  assert.equal(video.playCalls, 2)
  assert.equal(video.paused, false)
  video.dispatchEvent(new Event('playing'))
  video.paused = true
  video.dispatchEvent(new Event('canplay'))
  assert.equal(video.playCalls, 2, 'later manual pauses must not be overridden')
  seek.destroy()
})

test('pause cancels a pending resume and late media events cannot restart it', () => {
  const video = new Video()
  const seek = createVideoSeekController(video)
  seek.begin()
  seek.commit(40)
  seek.cancelResume()
  video.pause()
  video.dispatchEvent(new Event('seeked'))
  video.dispatchEvent(new Event('canplay'))
  assert.equal(video.paused, true)
  assert.equal(video.playCalls, 1)
  seek.destroy()
})

test('cancelling a drag restores playback without changing its position', () => {
  const video = new Video()
  const seek = createVideoSeekController(video)
  seek.begin()
  seek.cancel()
  assert.equal(video.currentTime, 10)
  assert.equal(video.paused, false)
  seek.destroy()
})

test('a second drag preserves pending resume intent and bounds the target', () => {
  const video = new Video()
  const seek = createVideoSeekController(video)
  seek.begin()
  seek.commit(80)
  video.pause()
  seek.begin()
  seek.commit(200)
  assert.equal(video.currentTime, 120)
  assert.equal(video.paused, false)
  seek.destroy()
  video.pause()
  video.dispatchEvent(new Event('canplay'))
  assert.equal(video.paused, true)
})

test('unavailable metadata cancels scrubbing instead of leaving playback paused', () => {
  const video = new Video()
  const seek = createVideoSeekController(video)
  seek.begin()
  video.duration = Number.NaN
  assert.equal(seek.commit(50), undefined)
  assert.equal(seek.scrubbing, false)
  assert.equal(video.currentTime, 10)
  assert.equal(video.paused, false)
  seek.destroy()
})

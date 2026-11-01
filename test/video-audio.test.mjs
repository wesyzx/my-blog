import assert from 'node:assert/strict'
import test from 'node:test'
import { createVideoAudioController } from '../lib/video-audio.mjs'
import { createVideoSeekController } from '../lib/video-seek.mjs'

class Video extends EventTarget {
  muted = false
  defaultMuted = false
  volume = 0.65
  paused = true
  seeking = false
  readyState = 4
  ended = false
  duration = 120
  currentTime = 10
  src = 'test.mp4'
  loaded = 0
  playCalls = 0
  pause() { this.paused = true }
  play() {
    this.playCalls += 1
    this.paused = false
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  }
  removeAttribute(name) { if (name === 'src') this.src = '' }
  load() { this.loaded += 1 }
}

function controller(t, video, onDeactivate = () => {}) {
  const states = []
  const audio = createVideoAudioController(video, {
    onMutedChange: (value) => states.push(value), onDeactivate,
  })
  t.after(() => audio.destroy())
  return { audio, states }
}

test('mute changes native audio output and unmute restores the previous volume', (t) => {
  const video = new Video()
  const { audio, states } = controller(t, video)
  assert.equal(audio.toggleMuted(), true)
  assert.equal(video.muted, true)
  assert.equal(video.defaultMuted, true)
  assert.equal(video.volume, 0)
  video.play()
  assert.equal(video.muted, true)
  assert.equal(video.volume, 0)
  assert.equal(audio.toggleMuted(), false)
  assert.equal(video.muted, false)
  assert.equal(video.defaultMuted, false)
  assert.equal(video.volume, 0.65)
  assert.equal(states.at(-1), false)
})

test('mute works when the device ignores programmatic volume changes', (t) => {
  const video = new Video()
  Object.defineProperty(video, 'volume', { get: () => 1, set() {} })
  const { audio } = controller(t, video)
  assert.equal(audio.toggleMuted(), true)
  assert.equal(video.muted, true)
  assert.equal(audio.toggleMuted(), false)
  assert.equal(video.muted, false)
})

test('mute works when the device rejects programmatic volume changes', (t) => {
  const video = new Video()
  Object.defineProperty(video, 'volume', {
    get: () => 1, set() { throw new Error('Device controls volume') },
  })
  const { audio } = controller(t, video)
  assert.equal(audio.toggleMuted(), true)
  assert.equal(video.muted, true)
  assert.equal(audio.toggleMuted(), false)
  assert.equal(video.muted, false)
})

test('native fullscreen unmute restores sound and synchronizes the button', (t) => {
  const video = new Video()
  const { audio, states } = controller(t, video)
  audio.toggleMuted()
  video.muted = false
  video.dispatchEvent(new Event('volumechange'))
  assert.equal(video.volume, 0.65)
  assert.equal(states.at(-1), false)
  assert.equal(video.defaultMuted, false)
})

test('starting another player pauses the previous video and cancels pending seek recovery', (t) => {
  const first = new Video()
  const second = new Video()
  const seek = createVideoSeekController(first)
  t.after(() => seek.destroy())
  controller(t, first, () => seek.cancelResume())
  controller(t, second)
  first.play()
  seek.begin()
  seek.commit(60)
  second.play()
  assert.equal(first.paused, true)
  assert.equal(second.paused, false)
  first.dispatchEvent(new Event('canplay'))
  assert.equal(first.paused, true)
  assert.equal(second.paused, false)
})

test('leaving a page stops its detached video and releases its source', () => {
  const video = new Video()
  let deactivated = false
  const audio = createVideoAudioController(video, {
    onMutedChange() {}, onDeactivate() { deactivated = true },
  })
  video.play()
  audio.destroy()
  assert.equal(video.paused, true)
  assert.equal(video.src, '')
  assert.equal(video.loaded, 1)
  assert.equal(deactivated, true)
})

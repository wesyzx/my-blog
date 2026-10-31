import assert from 'node:assert/strict'
import test from 'node:test'
import { videoPreviewTime } from '../lib/video-preview.mjs'

test('chooses a representative video preview frame instead of the first frame', () => {
  assert.equal(videoPreviewTime(0), 0)
  assert.equal(videoPreviewTime(0.4), 0.2)
  assert.equal(videoPreviewTime(2), 0.4)
  assert.equal(videoPreviewTime(10), 2)
  assert.equal(videoPreviewTime(27), 5)
  assert.equal(videoPreviewTime(100), 5)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { detectVisibleCrop, FULL_FRAME, sameCrop } from '../lib/video-crop.mjs'

function frame(width, height, content = null) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4 + 3] = 255
  }
  if (!content) return pixels

  for (let y = content.top; y < content.bottom; y += 1) {
    for (let x = content.left; x < content.right; x += 1) {
      const offset = (y * width + x) * 4
      pixels[offset] = 245
      pixels[offset + 1] = 242
      pixels[offset + 2] = 235
    }
  }
  return pixels
}

test('leaves a full-frame or mostly black frame unchanged', () => {
  assert.equal(detectVisibleCrop(frame(100, 100, { left: 0, top: 0, right: 100, bottom: 100 }), 100, 100), null)
  assert.equal(detectVisibleCrop(frame(100, 100, { left: 45, top: 45, right: 55, bottom: 55 }), 100, 100), null)
  assert.equal(detectVisibleCrop(new Uint8ClampedArray(8), 100, 100), null)
})

test('trims encoded top and bottom letterboxing', () => {
  const pixels = frame(100, 100, { left: 0, top: 20, right: 100, bottom: 75 })
  assert.deepEqual(detectVisibleCrop(pixels, 100, 100), {
    left: 0,
    top: 0.2,
    width: 1,
    height: 0.55,
  })
})

test('trims pillarboxing and rectangular padding on every side', () => {
  const pixels = frame(100, 100, { left: 10, top: 20, right: 90, bottom: 80 })
  assert.deepEqual(detectVisibleCrop(pixels, 100, 100), {
    left: 0.1,
    top: 0.2,
    width: 0.8,
    height: 0.6,
  })
})

test('does not mistake broad dark artwork for letterboxing', () => {
  const width = 100
  const height = 100
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = 50
    pixels[index * 4 + 1] = 48
    pixels[index * 4 + 2] = 45
    pixels[index * 4 + 3] = 255
  }
  assert.equal(detectVisibleCrop(pixels, width, height), null)
})

test('compares crop rectangles with a stable visual tolerance', () => {
  assert.equal(sameCrop(FULL_FRAME, { left: 0, top: 0, width: 1, height: 1 }), true)
  assert.equal(sameCrop(FULL_FRAME, { left: 0.001, top: 0, width: 0.999, height: 1 }), true)
  assert.equal(sameCrop(FULL_FRAME, { left: 0.01, top: 0, width: 0.99, height: 1 }), false)
})

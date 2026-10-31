/** @typedef {{ left: number, top: number, width: number, height: number }} CropRect */

/** @type {CropRect} */
export const FULL_FRAME = Object.freeze({ left: 0, top: 0, width: 1, height: 1 })
export const CROP_EPSILON = 0.002

/**
 * @param {CropRect} left
 * @param {CropRect} right
 */
export function sameCrop(left, right) {
  return Math.abs(left.left - right.left) < CROP_EPSILON
    && Math.abs(left.top - right.top) < CROP_EPSILON
    && Math.abs(left.width - right.width) < CROP_EPSILON
    && Math.abs(left.height - right.height) < CROP_EPSILON
}

/**
 * Detect the visible rectangle inside a video frame with encoded black
 * letterboxing. Work on a small RGBA snapshot so processing stays cheap.
 *
 * @param {Uint8Array | Uint8ClampedArray} pixels
 * @param {number} width
 * @param {number} height
 * @returns {CropRect | null}
 */
export function detectVisibleCrop(pixels, width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) return null
  if (pixels.length < width * height * 4) return null

  const rowBlack = new Uint16Array(height)
  const columnBlack = new Uint16Array(width)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      const black = pixels[offset] <= 40 && pixels[offset + 1] <= 40 && pixels[offset + 2] <= 40
      if (!black) continue
      rowBlack[y] += 1
      columnBlack[x] += 1
    }
  }

  const rowIsPadding = (y) => rowBlack[y] >= width * 0.96
  const columnIsPadding = (x) => columnBlack[x] >= height * 0.96
  let top = 0
  let bottom = height
  let left = 0
  let right = width

  while (top < bottom && top < height * 0.46 && rowIsPadding(top)) top += 1
  while (bottom > top && bottom > height * 0.54 && rowIsPadding(bottom - 1)) bottom -= 1
  while (left < right && left < width * 0.46 && columnIsPadding(left)) left += 1
  while (right > left && right > width * 0.54 && columnIsPadding(right - 1)) right -= 1

  // Do not treat a tiny bright subject on a mostly black frame as padding.
  if (right - left < width * 0.22 || bottom - top < height * 0.22) return null

  const crop = {
    left: left / width,
    top: top / height,
    width: (right - left) / width,
    height: (bottom - top) / height,
  }
  const changed = crop.left + (1 - crop.width) + crop.top + (1 - crop.height)
  return changed > 0.012 ? crop : null
}

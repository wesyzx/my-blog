import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'

export const GALLERY_CONTROL_FILE = 'gallery/相册同步记录.md'
export const GALLERY_CONTROL_TYPE = 'blog-gallery-control'

export function parseGalleryControl(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  const data = match ? YAML.parse(match[1]) : null
  if (data?.type !== GALLERY_CONTROL_TYPE || data.version !== 1
    || !Array.isArray(data.albumIds)
    || data.albumIds.some((id) => typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id))) {
    throw new Error('相册同步记录格式无效，请恢复同步记录后再发布')
  }
  return { albumIds: [...new Set(data.albumIds)] }
}

export async function readGalleryControl(blogRoot) {
  let source
  try {
    source = await fs.readFile(path.join(blogRoot, GALLERY_CONTROL_FILE), 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  return { ...parseGalleryControl(source), source }
}

// Claimed IDs always use the Vault copy, including deliberate absence/drafts.
export function mergeManagedGallery(local, remote, control) {
  const owned = new Set(control?.albumIds || [])
  for (const album of local) if (album.albumId) owned.add(album.albumId)
  return [...local, ...remote.filter((album) => !owned.has(album.albumId))]
    .sort((left, right) => right.date.localeCompare(left.date) || left.slug.localeCompare(right.slug))
}

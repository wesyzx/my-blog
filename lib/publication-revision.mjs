// Shared by the site builder and the image Worker. Hash only public album data.
export async function albumRevision(album) {
  const value = JSON.stringify([
    album.id, album.slug, album.title, album.date, album.category || '日常',
    album.excerpt || '', album.aliases || [],
    [...album.images].sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(({ src, width, height, kind, duration, poster, mimeType }) => [
        src, width, height, kind === 'video' ? 'video' : 'image',
        duration || null, poster || null, mimeType || null,
      ]),
  ])
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

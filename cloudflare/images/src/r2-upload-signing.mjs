const encode = (value) => encodeURIComponent(value)
  .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
const bytes = (value) => new TextEncoder().encode(value)
const hex = (value) => [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

async function hmac(key, value) {
  const imported = await crypto.subtle.importKey(
    'raw', typeof key === 'string' ? bytes(key) : key,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  return crypto.subtle.sign('HMAC', imported, bytes(value))
}

// Only the short-lived, object-specific PUT URL leaves the server.
export async function signR2Upload({
  accountId, accessKeyId, secretAccessKey, bucket, key, contentType,
  now = new Date(), expires = 3600,
}) {
  const host = `${accountId}.r2.cloudflarestorage.com`
  const path = `/${[bucket, ...key.split('/')].map(encode).join('/')}`
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const date = timestamp.slice(0, 8)
  const scope = `${date}/auto/s3/aws4_request`
  const parameters = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'content-type;host',
  }
  const query = Object.keys(parameters).sort()
    .map((name) => `${encode(name)}=${encode(parameters[name])}`).join('&')
  const canonical = [
    'PUT', path, query,
    `content-type:${contentType}\nhost:${host}\n`, 'content-type;host', 'UNSIGNED-PAYLOAD',
  ].join('\n')
  const digest = hex(await crypto.subtle.digest('SHA-256', bytes(canonical)))
  const dateKey = await hmac(`AWS4${secretAccessKey}`, date)
  const regionKey = await hmac(dateKey, 'auto')
  const serviceKey = await hmac(regionKey, 's3')
  const signingKey = await hmac(serviceKey, 'aws4_request')
  const signature = hex(await hmac(signingKey, `AWS4-HMAC-SHA256\n${timestamp}\n${scope}\n${digest}`))
  return `https://${host}${path}?${query}&X-Amz-Signature=${signature}`
}

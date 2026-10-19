import assert from 'node:assert/strict'
import test from 'node:test'
import { importTypeScript } from './helpers/import-typescript.mjs'

const { decodeRouteSlug } = await importTypeScript(new URL('../lib/slug.ts', import.meta.url))

test('decodes route slugs once and leaves malformed escapes as a 404 candidate', () => {
  assert.equal(decodeRouteSlug('%E6%9C%97%E9%9C%9E%E8%B1%86%E6%B5%86'), '朗霞豆浆')
  assert.equal(decodeRouteSlug('already-decoded'), 'already-decoded')
  assert.equal(decodeRouteSlug('%E0%A4%A'), '%E0%A4%A')
  assert.equal(decodeRouteSlug('%2525'), '%25')
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { enrichSayLocations, isCoordinateLabel } from '../lib/tmap-geocode.mjs'

const TEST_KEY = 'server-key-1'

test('recognizes Memos coordinate placeholders as unnamed locations', () => {
  for (const value of [
    undefined,
    '',
    '29.7989°, 121.5234°',
    '[29.80°, 121.52°]',
    '29.798890, 121.523441',
  ]) {
    assert.equal(isCoordinateLabel(value), true)
  }
  assert.equal(isCoordinateLabel('天一阁'), false)
  assert.equal(isCoordinateLabel('宁波市 29.80, 121.52'), false)
})

test('fills coordinate-only memo locations from Tencent reverse geocoding', async (t) => {
  const requests = []
  const fetcher = t.mock.fn(async (url) => {
    requests.push(new URL(url))
    return Response.json({
      status: 0,
      result: {
        address: '浙江省宁波市鄞州区首南街道和众社区',
        formatted_addresses: { recommend: '宁波市鄞州区首南街道和众社区' },
      },
    })
  })
  const says = [
    { slug: 'unnamed', location: '29.7989°, 121.5234°', latitude: 29.7989, longitude: 121.5234 },
    { slug: 'duplicate', latitude: 29.7989, longitude: 121.5234 },
    { slug: 'named', location: '天一阁', latitude: 29.8733, longitude: 121.5426 },
    { slug: 'no-map', location: '29.7989°, 121.5234°' },
  ]

  const enriched = await enrichSayLocations(says, { key: TEST_KEY, fetcher })

  assert.equal(requests.length, 1)
  assert.equal(requests[0].origin + requests[0].pathname, 'https://apis.map.qq.com/ws/geocoder/v1/')
  assert.equal(requests[0].searchParams.get('key'), TEST_KEY)
  assert.equal(requests[0].searchParams.get('get_poi'), '0')
  assert.notEqual(requests[0].searchParams.get('location'), '29.798900,121.523400')
  assert.equal(enriched[0].location, '宁波市鄞州区首南街道和众社区')
  assert.equal(enriched[1].location, '宁波市鄞州区首南街道和众社区')
  assert.equal(enriched[2].location, '天一阁')
  assert.equal(enriched[3].location, '29.7989°, 121.5234°')
})

test('keeps coordinates when no server key or lookup fails', async (t) => {
  const memo = { slug: 'unnamed', location: '30.1234°, 120.5678°', latitude: 30.1234, longitude: 120.5678 }
  assert.deepEqual(await enrichSayLocations([memo], { key: '' }), [memo])

  const failingFetcher = t.mock.fn(async () => Response.json({ status: 311, message: 'key invalid' }))
  const originalWarn = console.warn
  console.warn = () => {}
  try {
    assert.deepEqual(await enrichSayLocations([memo], { key: 'bad-key', fetcher: failingFetcher }), [memo])
    // A retry with the same bad key is backed off instead of hitting the API again.
    assert.deepEqual(await enrichSayLocations([memo], { key: 'bad-key', fetcher: failingFetcher }), [memo])
    assert.equal(failingFetcher.mock.callCount(), 1)

    // A corrected key must not be hidden by a previous key's failure cache.
    const workingFetcher = t.mock.fn(async () => Response.json({
      status: 0,
      result: { formatted_addresses: { recommend: '浙江省宁波市海曙区天一阁' } },
    }))
    const [resolved] = await enrichSayLocations([memo], { key: 'good-key', fetcher: workingFetcher })
    assert.equal(resolved.location, '浙江省宁波市海曙区天一阁')
  } finally {
    console.warn = originalWarn
  }
})

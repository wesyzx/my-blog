import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('..', import.meta.url))
const builder = join(root, 'shortcuts', 'build.py')

function parseWorkflow(path) {
  const result = spawnSync('python3', ['-c', [
    'import json, plistlib, sys',
    'with open(sys.argv[1], "rb") as source:',
    '    print(json.dumps(plistlib.load(source), ensure_ascii=False, default=lambda value: value.hex()))',
  ].join('\n'), path], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

test('the public album shortcut reads one Photos album, converts to JPEG and publishes it', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gallery-shortcut-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const result = spawnSync('python3', [builder, '--output-dir', directory], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  const path = join(directory, '相册同步到博客-unsigned.shortcut')
  const workflow = parseWorkflow(path)
  const actions = workflow.WFWorkflowActions
  const ids = actions.map((entry) => entry.WFWorkflowActionIdentifier)

  assert.equal(workflow.WFWorkflowName, '相册同步到博客')
  assert.equal(ids.filter((identifier) => identifier === 'is.workflow.actions.ask').length, 3)
  assert.ok(actions[0].WFWorkflowActionParameters.WFCommentActionText.includes('照片'))
  assert.equal(statSync(path).mode & 0o777, 0o600)

  const findPhotos = actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.filter.photos')
  const params = findPhotos.WFWorkflowActionParameters
  assert.equal(params.WFContentItemSortProperty, 'Date Taken')
  assert.equal(params.WFContentItemSortOrder, 'Oldest First')
  assert.equal(params.WFContentItemLimitEnabled, true)
  assert.equal(params.WFContentItemLimitNumber, 100)
  assert.equal(params.WFContentItemFilter.Value.WFActionParameterFilterTemplates[0].Property, 'Album')
  assert.equal(
    params.WFContentItemFilter.Value.WFActionParameterFilterTemplates[1].Values.Enumeration.Value,
    'Image',
  )

  const convert = actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.image.convert')
  assert.equal(convert.WFWorkflowActionParameters.WFImageFormat, 'JPEG')
  assert.equal(convert.WFWorkflowActionParameters.WFImageCompressionQuality, 0.9)

  const requests = actions.filter((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.downloadurl')
  assert.equal(requests.length, 3)
  assert.equal(requests[0].WFWorkflowActionParameters.WFURL, 'https://img.215320.xyz/internal/gallery/albums')
  assert.equal(requests[0].WFWorkflowActionParameters.WFHTTPBodyType, 'JSON')
  const createKeys = requests[0].WFWorkflowActionParameters.WFJSONValues.Value.WFDictionaryFieldValueItems
    .map((item) => item.WFKey.Value.string)
  assert.deepEqual(createKeys, ['title', 'date'])

  const upload = requests[1].WFWorkflowActionParameters
  assert.match(upload.WFURL.Value.string, /^https:\/\/img\.215320\.xyz\/internal\/gallery\/albums\/.*\/photos$/)
  assert.equal(upload.WFHTTPBodyType, 'File')
  assert.equal(upload.WFRequestVariable.Value.OutputName, 'Converted Image')
  assert.deepEqual(upload.WFFormValues.Value.WFDictionaryFieldValueItems, [])
  const uploadHeaders = upload.WFHTTPHeaders.Value.WFDictionaryFieldValueItems
    .map((item) => [item.WFKey.Value.string, item.WFValue.Value.string])
  assert.deepEqual(uploadHeaders, [
    ['Authorization', 'Bearer \ufffc'],
    ['Content-Type', 'image/jpeg'],
  ])

  const publish = requests[2].WFWorkflowActionParameters
  assert.match(publish.WFURL.Value.string, /\/publish$/)
  assert.equal(publish.WFHTTPMethod, 'POST')
  assert.equal(publish.WFHTTPBodyType, undefined)
  assert.ok(ids.includes('is.workflow.actions.previewdocument'))
  assert.ok(ids.includes('is.workflow.actions.openurl'))

  const repeatStarts = actions.filter((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.repeat.each'
    && entry.WFWorkflowActionParameters.WFControlFlowMode === 0)
  const repeatEnds = actions.filter((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.repeat.each'
    && entry.WFWorkflowActionParameters.WFControlFlowMode === 2)
  assert.equal(repeatStarts.length, 1)
  assert.equal(repeatEnds.length, 1)
  assert.equal(
    repeatStarts[0].WFWorkflowActionParameters.GroupingIdentifier,
    repeatEnds[0].WFWorkflowActionParameters.GroupingIdentifier,
  )
})

test('personal builds keep the token only in the protected temporary directory', (t) => {
  const directory = join('/private/tmp/personal-gallery-shortcuts', `test-${process.pid}-${Date.now()}`)
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const token = 'private-gallery-token-1234567890'
  const result = spawnSync('python3', [builder, '--personal', '--output-dir', directory], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GALLERY_UPLOAD_TOKEN: token },
  })
  assert.equal(result.status, 0, result.stderr)
  const path = result.stdout.trim()
  assert.ok(path.startsWith(directory + '/'))
  assert.equal(statSync(directory).mode & 0o777, 0o700)
  assert.equal(statSync(path).mode & 0o777, 0o600)
  const actions = parseWorkflow(path).WFWorkflowActions
  assert.equal(actions.some((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.ask'
    && entry.WFWorkflowActionParameters.WFAskActionPrompt.includes('上传令牌')), false)
  assert.ok(actions.some((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.gettext'
    && entry.WFWorkflowActionParameters.WFTextActionText.Value.string === token))
})

test('personal builds reject output outside the protected temporary directory', () => {
  const token = 'private-gallery-token-1234567890'
  const result = spawnSync('python3', [builder, '--personal', '--output-dir', root], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GALLERY_UPLOAD_TOKEN: token },
  })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /must stay below/)
})

test('the signed public shortcut contains no upload token', () => {
  const bytes = readFileSync(join(root, 'shortcuts', '相册同步到博客.shortcut'))
  assert.equal(bytes.subarray(0, 4).toString(), 'AEA1')
  assert.doesNotMatch(bytes.toString('latin1'), /Bearer [A-Za-z0-9._~-]{24,}/)
})

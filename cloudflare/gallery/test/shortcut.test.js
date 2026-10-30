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

test('the public gallery shortcut selects photos, converts to JPEG and publishes them', (t) => {
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
  assert.equal(ids.filter((identifier) => identifier === 'is.workflow.actions.ask').length, 4)
  assert.ok(actions[0].WFWorkflowActionParameters.WFCommentActionText.includes('照片'))
  assert.equal(statSync(path).mode & 0o777, 0o600)

  const selectPhotos = actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.selectphoto')
  assert.equal(selectPhotos.WFWorkflowActionParameters.WFSelectMultiplePhotos, true)
  const datePrompt = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.ask'
    && entry.WFWorkflowActionParameters.CustomOutputName === 'Gallery Date')
  assert.match(datePrompt.WFWorkflowActionParameters.WFAskActionPrompt, /YYYY-MM-DD/)
  assert.equal(datePrompt.WFWorkflowActionParameters.WFAskActionDefaultAnswer.Value.string, '\ufffc')
  const defaultDate = datePrompt.WFWorkflowActionParameters.WFAskActionDefaultAnswer.Value
    .attachmentsByRange['{0, 1}']
  assert.deepEqual(defaultDate, {
    Type: 'ActionOutput',
    OutputUUID: actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.format.date')
      .WFWorkflowActionParameters.UUID,
    OutputName: 'Formatted Date',
  })
  assert.ok(actions.indexOf(datePrompt) > actions.indexOf(selectPhotos))

  assert.equal(ids.includes('is.workflow.actions.filter.photos'), false)
  assert.equal(ids.includes('is.workflow.actions.filter.images'), false)

  const convert = actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.image.convert')
  assert.equal(convert.WFWorkflowActionParameters.WFImageFormat, 'JPEG')
  assert.equal(convert.WFWorkflowActionParameters.WFImageCompressionQuality, 0.9)

  const requests = actions.filter((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.downloadurl')
  assert.equal(requests.length, 3)
  assert.equal(requests[0].WFWorkflowActionParameters.WFURL, 'https://img.215320.xyz/internal/gallery/albums')
  assert.equal(requests[0].WFWorkflowActionParameters.WFHTTPBodyType, 'JSON')
  const createKeys = requests[0].WFWorkflowActionParameters.WFJSONValues.Value.WFDictionaryFieldValueItems
  assert.deepEqual(createKeys.map((item) => item.WFKey.Value.string), ['title', 'slug', 'date'])
  const createDate = createKeys.find((item) => item.WFKey.Value.string === 'date')
  assert.equal(createDate.WFValue.Value.string, '\ufffc')
  assert.deepEqual(createDate.WFValue.Value.attachmentsByRange['{0, 1}'], {
    Type: 'ActionOutput',
    OutputUUID: datePrompt.WFWorkflowActionParameters.UUID,
    OutputName: 'Gallery Date',
  })

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
  assert.equal(publish.WFHTTPBodyType, 'JSON')
  assert.deepEqual(publish.WFJSONValues.Value.WFDictionaryFieldValueItems, [])
  const publishHeaders = publish.WFHTTPHeaders.Value.WFDictionaryFieldValueItems
    .map((item) => [item.WFKey.Value.string, item.WFValue.Value.string])
  assert.deepEqual(publishHeaders, [
    ['Authorization', 'Bearer \ufffc'],
    ['Content-Type', 'application/json'],
  ])
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
  assert.equal(repeatStarts[0].WFWorkflowActionParameters.WFInput.Value.OutputName, 'Photos')
  assert.equal(
    repeatStarts[0].WFWorkflowActionParameters.WFInput.Value.OutputUUID,
    selectPhotos.WFWorkflowActionParameters.UUID,
  )
  assert.deepEqual(convert.WFWorkflowActionParameters.WFInput.Value, {
    Type: 'Variable',
    VariableName: 'Repeat Item',
  })
  assert.equal(
    repeatStarts[0].WFWorkflowActionParameters.GroupingIdentifier,
    repeatEnds[0].WFWorkflowActionParameters.GroupingIdentifier,
  )
})

test('the public video shortcut selects videos, preserves QuickTime and publishes them', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'gallery-video-shortcut-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const result = spawnSync('python3', [
    builder,
    '--media',
    'video',
    '--name',
    '视频同步到博客',
    '--output-dir',
    directory,
  ], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  const path = join(directory, '视频同步到博客-unsigned.shortcut')
  const workflow = parseWorkflow(path)
  const actions = workflow.WFWorkflowActions
  const ids = actions.map((entry) => entry.WFWorkflowActionIdentifier)

  assert.equal(workflow.WFWorkflowName, '视频同步到博客')
  assert.equal(statSync(path).mode & 0o777, 0o600)
  assert.ok(actions[0].WFWorkflowActionParameters.WFCommentActionText.includes('视频'))
  assert.equal(ids.filter((identifier) => identifier === 'is.workflow.actions.ask').length, 4)

  const selectVideos = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.selectphoto')
  assert.equal(selectVideos.WFWorkflowActionParameters.WFSelectMultiplePhotos, true)
  assert.equal(selectVideos.WFWorkflowActionParameters.WFPhotoPickerTypes, 'Videos')
  assert.equal(ids.includes('is.workflow.actions.image.convert'), false)

  const datePrompt = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.ask'
    && entry.WFWorkflowActionParameters.CustomOutputName === 'Gallery Date')
  assert.match(datePrompt.WFWorkflowActionParameters.WFAskActionPrompt, /YYYY-MM-DD/)
  assert.match(datePrompt.WFWorkflowActionParameters.WFAskActionPrompt, /视频日期/)
  assert.ok(actions.indexOf(datePrompt) > actions.indexOf(selectVideos))

  const requests = actions.filter((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.downloadurl')
  assert.equal(requests.length, 3)
  assert.equal(requests[0].WFWorkflowActionParameters.WFURL, 'https://img.215320.xyz/internal/gallery/albums')
  const upload = requests[1].WFWorkflowActionParameters
  assert.match(upload.WFURL.Value.string, /^https:\/\/img\.215320\.xyz\/internal\/gallery\/albums\/.*\/videos$/)
  assert.equal(upload.WFHTTPBodyType, 'File')
  assert.deepEqual(upload.WFRequestVariable.Value, {
    Type: 'Variable',
    VariableName: 'Repeat Item',
  })
  const uploadHeaders = upload.WFHTTPHeaders.Value.WFDictionaryFieldValueItems
    .map((item) => [item.WFKey.Value.string, item.WFValue.Value.string])
  assert.deepEqual(uploadHeaders, [
    ['Authorization', 'Bearer \ufffc'],
    ['Content-Type', 'video/quicktime'],
  ])

  const publish = requests[2].WFWorkflowActionParameters
  assert.match(publish.WFURL.Value.string, /\/publish$/)
  assert.equal(publish.WFHTTPMethod, 'POST')
  assert.equal(publish.WFHTTPBodyType, 'JSON')
  assert.deepEqual(publish.WFJSONValues.Value.WFDictionaryFieldValueItems, [])
  const publishHeaders = publish.WFHTTPHeaders.Value.WFDictionaryFieldValueItems
    .map((item) => [item.WFKey.Value.string, item.WFValue.Value.string])
  assert.deepEqual(publishHeaders, [
    ['Authorization', 'Bearer \ufffc'],
    ['Content-Type', 'application/json'],
  ])
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
  assert.equal(repeatStarts[0].WFWorkflowActionParameters.WFInput.Value.OutputName, 'Photos')
  assert.equal(
    repeatStarts[0].WFWorkflowActionParameters.WFInput.Value.OutputUUID,
    selectVideos.WFWorkflowActionParameters.UUID,
  )
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

test('the signed public shortcuts contain no upload token', () => {
  for (const filename of ['相册同步到博客.shortcut', '视频同步到博客.shortcut']) {
    const bytes = readFileSync(join(root, 'shortcuts', filename))
    assert.equal(bytes.subarray(0, 4).toString(), 'AEA1')
    assert.doesNotMatch(bytes.toString('latin1'), /Bearer [A-Za-z0-9._~-]{24,}/)
  }
})

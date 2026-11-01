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
  const selectedCount = actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.count')
  assert.equal(selectedCount.WFWorkflowActionParameters.WFCountType, 'Items')
  assert.deepEqual(selectedCount.WFWorkflowActionParameters.WFInput.Value, {
    Type: 'ActionOutput',
    OutputUUID: selectPhotos.WFWorkflowActionParameters.UUID,
    OutputName: 'Photos',
  })
  assert.deepEqual(selectedCount.WFWorkflowActionParameters.Input, selectedCount.WFWorkflowActionParameters.WFInput)
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
  assert.equal(ids.includes('is.workflow.actions.encodemedia'), false)

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
  const albumId = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.getvalueforkey'
    && entry.WFWorkflowActionParameters.WFDictionaryKey.Value.string === 'albumId')

  const upload = requests[1].WFWorkflowActionParameters
  assert.match(upload.WFURL.Value.string, /^https:\/\/img\.215320\.xyz\/internal\/gallery\/albums\/.*\/photos$/)
  assert.equal(upload.WFHTTPBodyType, 'File')
  assert.deepEqual(upload.WFRequestVariable, {
    WFSerializationType: 'WFTextTokenAttachment',
    Value: {
      Type: 'ActionOutput',
      OutputUUID: convert.WFWorkflowActionParameters.UUID,
      OutputName: 'Converted Image',
    },
  })
  assert.deepEqual(upload.WFFormValues.Value.WFDictionaryFieldValueItems, [])
  const uploadHeaders = upload.WFHTTPHeaders.Value.WFDictionaryFieldValueItems
    .map((item) => [item.WFKey.Value.string, item.WFValue.Value.string])
  assert.deepEqual(uploadHeaders, [
    ['Authorization', 'Bearer \ufffc'],
    ['Content-Type', 'image/jpeg'],
  ])
  const uploadDictionary = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.detect.dictionary'
    && entry.WFWorkflowActionParameters.WFInput.Value.OutputUUID === upload.UUID)
  const uploadOk = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.getvalueforkey'
    && entry.WFWorkflowActionParameters.WFDictionaryKey.Value.string === 'ok')
  assert.deepEqual(uploadOk.WFWorkflowActionParameters.WFInput.Value, {
    Type: 'ActionOutput',
    OutputUUID: uploadDictionary.WFWorkflowActionParameters.UUID,
    OutputName: 'Dictionary',
  })

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
  const galleryUrl = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.getvalueforkey'
    && entry.WFWorkflowActionParameters.WFDictionaryKey.Value.string === 'url')
  assert.equal(ids.includes('is.workflow.actions.previewdocument'), false)
  assert.ok(ids.includes('is.workflow.actions.openurl'))
  assert.equal(ids.filter((identifier) => identifier === 'is.workflow.actions.exit').length, 4)
  assert.equal(ids.filter((identifier) => identifier === 'is.workflow.actions.showresult').length, 4)
  for (const result of actions.filter((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.showresult')) {
    // Show Result's native parameter is Text; WFInput imports as an empty,
    // interactive parameter prompt and hides the actual failure response.
    assert.equal(result.WFWorkflowActionParameters.Text.WFSerializationType, 'WFTextTokenString')
    assert.equal('WFInput' in result.WFWorkflowActionParameters, false)
  }

  const conditionalStarts = actions.filter((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.conditional'
    && entry.WFWorkflowActionParameters.WFControlFlowMode === 0)
  assert.deepEqual(
    conditionalStarts.map((entry) => entry.WFWorkflowActionParameters.WFCondition),
    [2, 100, 100, 100],
  )
  assert.equal(
    conditionalStarts[0].WFWorkflowActionParameters.WFNumberValue,
    '0',
  )
  const guardSources = [selectedCount, albumId, uploadOk, galleryUrl]
  const guardOutputNames = ['Count', 'Dictionary Value', 'Dictionary Value', 'Dictionary Value']
  conditionalStarts.forEach((guard, index) => {
    assert.deepEqual(guard.WFWorkflowActionParameters.WFInput, {
      Type: 'Variable',
      Variable: {
        WFSerializationType: 'WFTextTokenAttachment',
        Value: {
          Type: 'ActionOutput',
          OutputUUID: guardSources[index].WFWorkflowActionParameters.UUID,
          OutputName: guardOutputNames[index],
        },
      },
    })
  })
  for (const guard of conditionalStarts) {
    const group = actions.filter((entry) =>
      entry.WFWorkflowActionIdentifier === 'is.workflow.actions.conditional'
      && entry.WFWorkflowActionParameters.GroupingIdentifier
        === guard.WFWorkflowActionParameters.GroupingIdentifier)
    assert.deepEqual(group.map((entry) => entry.WFWorkflowActionParameters.WFControlFlowMode), [0, 1, 2])
  }

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

test('the public video shortcut selects videos, transcodes them to H.264 and publishes them', (t) => {
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
  assert.ok(actions[1].WFWorkflowActionParameters.WFCommentActionText.includes('H.264'))
  assert.equal(ids.filter((identifier) => identifier === 'is.workflow.actions.ask').length, 4)

  const selectVideos = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.selectphoto')
  assert.equal(selectVideos.WFWorkflowActionParameters.WFSelectMultiplePhotos, true)
  assert.equal(selectVideos.WFWorkflowActionParameters.WFPhotoPickerTypes, 'Videos')
  assert.equal(ids.includes('is.workflow.actions.image.convert'), false)
  const selectedCount = actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.count')
  assert.equal(selectedCount.WFWorkflowActionParameters.WFCountType, 'Items')
  assert.deepEqual(selectedCount.WFWorkflowActionParameters.WFInput.Value, {
    Type: 'ActionOutput',
    OutputUUID: selectVideos.WFWorkflowActionParameters.UUID,
    OutputName: 'Photos',
  })
  assert.deepEqual(selectedCount.WFWorkflowActionParameters.Input, selectedCount.WFWorkflowActionParameters.WFInput)
  const encodeVideo = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.encodemedia')
  assert.deepEqual(encodeVideo.WFWorkflowActionParameters.WFMedia.Value, {
    Type: 'Variable',
    VariableName: 'Repeat Item',
  })
  assert.equal(encodeVideo.WFWorkflowActionParameters.WFMediaAudioOnly, false)
  assert.equal(encodeVideo.WFWorkflowActionParameters.WFMediaSize, '1920x1080')
  assert.equal(encodeVideo.WFWorkflowActionParameters.WFMediaSpeed, 'Normal')

  const datePrompt = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.ask'
    && entry.WFWorkflowActionParameters.CustomOutputName === 'Gallery Date')
  assert.match(datePrompt.WFWorkflowActionParameters.WFAskActionPrompt, /YYYY-MM-DD/)
  assert.match(datePrompt.WFWorkflowActionParameters.WFAskActionPrompt, /视频日期/)
  assert.ok(actions.indexOf(datePrompt) > actions.indexOf(selectVideos))

  const requests = actions.filter((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.downloadurl')
  assert.equal(requests.length, 5)
  assert.equal(requests[0].WFWorkflowActionParameters.WFURL, 'https://img.215320.xyz/internal/gallery/albums')
  const albumId = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.getvalueforkey'
    && entry.WFWorkflowActionParameters.WFDictionaryKey.Value.string === 'albumId')
  const prepare = requests[1].WFWorkflowActionParameters
  assert.match(prepare.WFURL.Value.string, /\/video-uploads$/)
  assert.equal(prepare.WFHTTPMethod, 'POST')
  assert.equal(prepare.WFHTTPBodyType, 'JSON')
  const uploadUrl = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.getvalueforkey'
    && entry.WFWorkflowActionParameters.WFDictionaryKey.Value.string === 'uploadUrl')
  const completeUrl = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.getvalueforkey'
    && entry.WFWorkflowActionParameters.WFDictionaryKey.Value.string === 'completeUrl')
  const directPut = requests[2].WFWorkflowActionParameters
  assert.equal(directPut.WFURL.Value.attachmentsByRange['{0, 1}'].OutputUUID, uploadUrl.WFWorkflowActionParameters.UUID)
  assert.equal(directPut.WFHTTPMethod, 'PUT')
  assert.equal(directPut.WFHTTPBodyType, 'File')
  assert.deepEqual(directPut.WFRequestVariable, {
    WFSerializationType: 'WFTextTokenAttachment',
    Value: { Type: 'ActionOutput', OutputUUID: encodeVideo.WFWorkflowActionParameters.UUID, OutputName: 'Encoded Media' },
  })
  const uploadHeaders = directPut.WFHTTPHeaders.Value.WFDictionaryFieldValueItems
    .map((item) => [item.WFKey.Value.string, item.WFValue.Value.string])
  assert.deepEqual(uploadHeaders, [['Content-Type', 'video/quicktime']])
  const upload = requests[3].WFWorkflowActionParameters
  assert.equal(upload.WFURL.Value.attachmentsByRange['{0, 1}'].OutputUUID, completeUrl.WFWorkflowActionParameters.UUID)
  assert.equal(upload.WFHTTPMethod, 'POST')
  assert.equal(upload.WFHTTPBodyType, 'JSON')
  assert.ok(upload.WFHTTPHeaders.Value.WFDictionaryFieldValueItems.some((item) => item.WFKey.Value.string === 'Authorization'))
  const uploadDictionary = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.detect.dictionary'
    && entry.WFWorkflowActionParameters.WFInput.Value.OutputUUID === upload.UUID)
  const uploadOk = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.getvalueforkey'
    && entry.WFWorkflowActionParameters.WFDictionaryKey.Value.string === 'ok')
  assert.deepEqual(uploadOk.WFWorkflowActionParameters.WFInput.Value, {
    Type: 'ActionOutput', OutputUUID: uploadDictionary.WFWorkflowActionParameters.UUID, OutputName: 'Dictionary',
  })
  const uploadError = actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.showresult'
    && entry.WFWorkflowActionParameters.Text.Value.string.startsWith('视频上传失败'))
  const errorReferences = Object.values(uploadError.WFWorkflowActionParameters.Text.Value.attachmentsByRange)
  assert.deepEqual(errorReferences.map((ref) => ref.OutputUUID), [upload.UUID, directPut.UUID])

  const publish = requests[4].WFWorkflowActionParameters
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
  const galleryUrl = actions.find((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.getvalueforkey'
    && entry.WFWorkflowActionParameters.WFDictionaryKey.Value.string === 'url')
  assert.equal(ids.includes('is.workflow.actions.previewdocument'), false)
  assert.ok(ids.includes('is.workflow.actions.openurl'))
  assert.equal(ids.filter((identifier) => identifier === 'is.workflow.actions.exit').length, 5)
  assert.equal(ids.filter((identifier) => identifier === 'is.workflow.actions.showresult').length, 5)
  for (const result of actions.filter((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.showresult')) {
    assert.equal(result.WFWorkflowActionParameters.Text.WFSerializationType, 'WFTextTokenString')
    assert.equal('WFInput' in result.WFWorkflowActionParameters, false)
  }

  const conditionalStarts = actions.filter((entry) =>
    entry.WFWorkflowActionIdentifier === 'is.workflow.actions.conditional'
    && entry.WFWorkflowActionParameters.WFControlFlowMode === 0)
  assert.deepEqual(
    conditionalStarts.map((entry) => entry.WFWorkflowActionParameters.WFCondition),
    [2, 100, 100, 100, 100],
  )
  assert.equal(
    conditionalStarts[0].WFWorkflowActionParameters.WFNumberValue,
    '0',
  )
  const guardSources = [selectedCount, albumId, uploadUrl, uploadOk, galleryUrl]
  const guardOutputNames = ['Count', 'Dictionary Value', 'Dictionary Value', 'Dictionary Value', 'Dictionary Value']
  conditionalStarts.forEach((guard, index) => {
    assert.deepEqual(guard.WFWorkflowActionParameters.WFInput, {
      Type: 'Variable',
      Variable: {
        WFSerializationType: 'WFTextTokenAttachment',
        Value: {
          Type: 'ActionOutput',
          OutputUUID: guardSources[index].WFWorkflowActionParameters.UUID,
          OutputName: guardOutputNames[index],
        },
      },
    })
  })
  for (const guard of conditionalStarts) {
    const group = actions.filter((entry) =>
      entry.WFWorkflowActionIdentifier === 'is.workflow.actions.conditional'
      && entry.WFWorkflowActionParameters.GroupingIdentifier
        === guard.WFWorkflowActionParameters.GroupingIdentifier)
    assert.deepEqual(group.map((entry) => entry.WFWorkflowActionParameters.WFControlFlowMode), [0, 1, 2])
  }

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

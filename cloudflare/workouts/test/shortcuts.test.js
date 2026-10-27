import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('..', import.meta.url))
const builder = join(root, 'shortcuts', 'build.py')

function buildShortcuts() {
  const directory = mkdtempSync(join(tmpdir(), 'workout-shortcuts-'))
  const result = spawnSync('python3', [builder, '--all', '--output-dir', directory], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  return directory
}

function parseWorkflow(path) {
  const result = spawnSync('python3', ['-c', [
    'import json, plistlib, sys',
    'with open(sys.argv[1], "rb") as source:',
    '    print(json.dumps(plistlib.load(source), ensure_ascii=False, default=lambda value: value.hex()))',
  ].join('\n'), path], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

test('summary shortcuts query flights climbed for the workout window and upload it', (t) => {
  const directory = buildShortcuts()
  t.after(() => rmSync(directory, { recursive: true, force: true }))

  for (const name of ['同步最近运动到博客', '一键同步运动到博客', '预览最近运动上传数据']) {
    const path = join(directory, `${name}-unsigned.shortcut`)
    const actions = parseWorkflow(path).WFWorkflowActions
    const health = actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.filter.health.quantity')
    assert.ok(health, `${name}: health query`)
    const filters = health.WFWorkflowActionParameters.WFContentItemFilter.Value.WFActionParameterFilterTemplates
    assert.equal(filters[0].Values.Enumeration.Value, 'Flights Climbed')
    assert.equal(filters[1].Operator, 1003)
    assert.ok(actions.some((entry) => entry.WFWorkflowActionParameters.WFStatisticsOperation === 'Sum'))
    if (name !== '预览最近运动上传数据') {
      const upload = actions.find((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.downloadurl'
        && entry.WFWorkflowActionParameters.WFJSONValues)
      assert.ok(upload, `${name}: upload body`)
      const keys = upload.WFWorkflowActionParameters.WFJSONValues.Value.WFDictionaryFieldValueItems
        .map((item) => item.WFKey.Value.string)
      assert.ok(keys.includes('flightsClimbed'), `${name}: flightsClimbed field`)
    }
  }
})

test('route shortcut does not include a health sample query', (t) => {
  const directory = buildShortcuts()
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const actions = parseWorkflow(join(directory, '上传运动轨迹到博客-unsigned.shortcut')).WFWorkflowActions
  assert.ok(!actions.some((entry) => entry.WFWorkflowActionIdentifier === 'is.workflow.actions.filter.health.quantity'))
})

test('signed public shortcuts are present and do not contain an ingest token', () => {
  for (const name of ['同步最近运动到博客', '上传运动轨迹到博客', '一键同步运动到博客']) {
    const bytes = readFileSync(join(root, 'shortcuts', `${name}.shortcut`))
    assert.ok(bytes.length > 2_000, basename(name))
    assert.equal(bytes.subarray(0, 4).toString(), 'AEA1')
    assert.doesNotMatch(bytes.toString('latin1'), /Bearer [A-Za-z0-9._~-]{16,}/)
  }
})

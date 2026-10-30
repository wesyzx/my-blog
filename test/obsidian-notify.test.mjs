import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

test('Bark suppresses brief errors, deduplicates sustained faults, and sends recovery', () => {
  const modulePath = fileURLToPath(new URL('../ops/obsidian-publisher/notify.py', import.meta.url))
  const result = execFileSync('python3', ['-c', `
import importlib.util, json, sys
sys.path.insert(0, str(__import__('pathlib').Path(sys.argv[1]).parent))
spec = importlib.util.spec_from_file_location("notifier", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
check = module.notification
fault = {"healthy": False, "phase": "git_publish"}
good = {"healthy": True}
assert check(fault, {})[3] is None
assert check(fault, {"failures": 1})[3] is None
assert check(fault, {"failures": 2})[3] is not None
assert check(fault, {"failures": 3, "notified": True})[3] is None
assert check(good, {"failures": 3, "notified": True})[3] is not None
assert check(good, {})[3] is None
print(json.dumps({"ok": True}))
`, modulePath], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } })
  assert.equal(JSON.parse(result).ok, true)
})

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
additional_notice = module.additional_notice
fault = {"healthy": False, "phase": "git_publish"}
good = {"healthy": True}
assert check(fault, {})[3] is None
assert check(fault, {"failures": 1})[3] is None
assert check(fault, {"failures": 2})[3] is not None
assert check(fault, {"failures": 3, "notified": True})[3] is None
assert check(good, {"failures": 3, "notified": True})[3] is not None
assert check(good, {})[3] is None
cleanup = {"healthy": True, "r2_cleanup": {
    "status": "completed", "revision": "rev-1", "deleted": 2,
    "protectedCount": 5, "recentCount": 1}}
title, body, key = additional_notice(cleanup, {})
assert title == "R2 图片清理完成"
assert "删除 2 个" in body and "15 天" in body
assert additional_notice(cleanup, {"notice_key": key})[0] is None
cleanup["r2_cleanup"]["graceDays"] = 30
assert "30 天" in additional_notice(cleanup, {})[1]

failed = {"healthy": True, "r2_cleanup": {
    "status": "failed", "revision": "rev-1", "error": {"code": "r2_cleanup_network"}}}
title, body, key = additional_notice(failed, {})
assert title == "R2 图片清理失败"
assert "网络" in body
print(json.dumps({"ok": True}))
`, modulePath], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } })
  assert.equal(JSON.parse(result).ok, true)
})

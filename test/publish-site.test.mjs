import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

test('site verification checks the deployed digest and distinguishes waiting from delayed', () => {
  const folder = fileURLToPath(new URL('../ops/obsidian-publisher/', import.meta.url))
  const result = execFileSync('python3', ['-c', `
import sys, json, datetime
sys.path.insert(0, sys.argv[1])
from verify_site import check_site
from notify import additional_notice
class Response:
    status = 200
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self, size): return json.dumps({"version": 1, "obsidian_revision": "new", "commit": "abc"}).encode()
def transport(request, timeout):
    assert request.full_url.startswith("https://guanyan.me/publish-status.json?")
    assert timeout == 8
    return Response()
assert check_site("new", transport=transport)["status"] == "verified"
assert check_site("old", transport=transport)["status"] == "waiting"
old = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=20)).isoformat()
assert check_site("old", old, transport=transport)["status"] == "delayed"
def offline(*args, **kwargs): raise OSError()
assert check_site("new", transport=offline)["reason"] == "verification_unavailable"
current = {"healthy": True, "held_sections": ["gallery"], "site": {"status": "waiting"}}
title, body, key = additional_notice(current, {})
assert title and "其他栏目继续同步" in body
assert additional_notice(current, {"notice_key": key})[0] is None
print("ok")
`, folder], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } })
  assert.equal(result.trim(), 'ok')
})

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

test('R2 cleanup performs a 30-day dry run before confirmed deletion', () => {
  const folder = fileURLToPath(new URL('../ops/obsidian-publisher/', import.meta.url))
  const result = execFileSync('python3', ['-c', `
import importlib.util, json, sys
sys.path.insert(0, sys.argv[1])
from cleanup_r2 import CleanupFailure, cleanup_r2
spec = importlib.util.spec_from_file_location("run_cycle", sys.argv[1] + "/run-cycle.py")
run_cycle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(run_cycle)

calls = []
class Response:
    status = 200
    def __init__(self, payload): self.payload = payload
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self, size): return json.dumps(self.payload).encode()

def transport(request, timeout):
    payload = json.loads(request.data)
    calls.append(payload)
    assert request.get_header("Authorization") == "Bearer token"
    assert request.get_header("User-agent") == "obsidian-blog-publisher/1.0"
    assert timeout == 30
    if payload["dryRun"]:
        return Response({"ok": True, "candidateCount": 2, "protectedCount": 3, "recentCount": 1, "deleted": 0})
    return Response({"ok": True, "candidateCount": 2, "protectedCount": 3, "recentCount": 1, "deleted": 2})

result = cleanup_r2(["https://img.guanyan.me/webp/blog/obsidian/a.webp"], ["id"], "token", transport=transport)
assert result["status"] == "completed" and result["deleted"] == 2
assert [call["dryRun"] for call in calls] == [True, False]
assert calls[1]["confirm"] == "delete-unreferenced-r2"
assert calls[0]["graceDays"] == 30

empty_calls = []
def empty_transport(request, timeout):
    empty_calls.append(json.loads(request.data))
    return Response({"ok": True, "candidateCount": 0, "protectedCount": 4, "recentCount": 0, "deleted": 0})
empty = cleanup_r2([], [], "token", transport=empty_transport)
assert empty["deleted"] == 0 and len(empty_calls) == 1
try:
    cleanup_r2([], [], "token", grace_days=29, transport=empty_transport)
    raise AssertionError("short grace accepted")
except CleanupFailure as error:
    assert error.issue["code"] == "r2_cleanup_config"
try:
    cleanup_r2([], [], "", transport=empty_transport)
    raise AssertionError("missing token accepted")
except CleanupFailure as error:
    assert error.issue["code"] == "r2_cleanup_auth"

called = []
def fake_cleanup(sources, ids, token, grace_days):
    called.append((sources, ids, token, grace_days))
    return {"ok": True, "deleted": 1, "protectedCount": 2, "recentCount": 0, "candidateCount": 1}
run_cycle.cleanup_r2 = fake_cleanup
manifest = {"fingerprint": "fp", "r2ProtectedSources": ["source"],
            "managedAlbumIds": ["id"], "r2CleanupSafe": True}
state = {"content_revision": "rev", "published": "fp", "site": {"status": "verified"},
         "r2_cleanup_input": {"revision": "rev", "protectedSources": ["source"],
                              "managedAlbumIds": ["id"], "safe": True}}
result = run_cycle.maybe_cleanup_r2(state, manifest, {"GALLERY_UPLOAD_TOKEN": "token"})
assert result["status"] == "completed" and result["deleted"] == 1
assert called == [(["source"], ["id"], "token", 30)]

recent = dict(result, attempted_at=__import__("time").time())
assert run_cycle.maybe_cleanup_r2(
    {"content_revision": "rev", "published": "fp", "site": {"status": "verified"},
     "r2_cleanup": recent}, manifest, {"GALLERY_UPLOAD_TOKEN": "token"}) == recent
assert len(called) == 1

run_cycle.maybe_cleanup_r2(
    {"content_revision": "rev", "published": "fp", "site": {"status": "verified"},
     "r2_cleanup": dict(recent, attempted_at=0)}, manifest,
    {"GALLERY_UPLOAD_TOKEN": "token"})
assert len(called) == 2

# A cleanup retry must wait for a newer draft to publish and verify; otherwise
# it could delete media still used by the live revision.
called.clear()
newer_manifest = {"fingerprint": "newer-fingerprint",
                  "r2ProtectedSources": ["draft-source"],
                  "managedAlbumIds": ["id"], "r2CleanupSafe": True}
state = {"content_revision": "rev", "published": "fp", "site": {"status": "verified"},
         "r2_cleanup_input": {"revision": "rev", "protectedSources": ["source"],
                              "managedAlbumIds": ["id"], "safe": True}}
unpublished = run_cycle.maybe_cleanup_r2(
    state, newer_manifest, {"GALLERY_UPLOAD_TOKEN": "token"})
assert unpublished["status"] == "waiting" and not called

old_reader_manifest = {"fingerprint": "fp", "managedAlbumIds": ["id"]}
unsafe = run_cycle.maybe_cleanup_r2(
    {"content_revision": "rev", "published": "fp", "site": {"status": "verified"}},
    old_reader_manifest, {"GALLERY_UPLOAD_TOKEN": "token"})
assert unsafe["status"] == "skipped" and unsafe["reason"] == "unsafe_reference_scan"
assert not called

waiting = run_cycle.maybe_cleanup_r2(
    {"content_revision": "rev", "published": "fp", "site": {"status": "waiting"}},
    manifest, {"GALLERY_UPLOAD_TOKEN": "token"})
assert waiting["status"] == "waiting" and not called
disabled = run_cycle.maybe_cleanup_r2(
    {"content_revision": "rev", "published": "fp", "site": {"status": "verified"},
     "r2_cleanup_input": {"revision": "rev", "safe": True}},
    manifest, {})
assert disabled["status"] == "disabled"
print("ok")
`, folder], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } })
  assert.equal(result.trim(), 'ok')
})

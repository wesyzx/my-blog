"""Verify the deployed content digest, independently of Git delivery."""
import datetime
import json
import time
import urllib.request


def check_site(revision, submitted_at=None, transport=urllib.request.urlopen):
    now = datetime.datetime.now(datetime.timezone.utc)
    age = 0
    if submitted_at:
        age = max(0, (now - datetime.datetime.fromisoformat(submitted_at)).total_seconds())
    result = {"status": "delayed" if age > 900 else "waiting",
              "checked_at": now.isoformat()}
    request = urllib.request.Request(
        f"https://guanyan.me/publish-status.json?_={time.time_ns()}",
        headers={"Cache-Control": "no-cache", "Accept": "application/json"})
    try:
        with transport(request, timeout=8) as response:
            if response.status != 200:
                raise ValueError("status unavailable")
            marker = json.loads(response.read(1024 * 1024))
        if marker.get("version") == 1 and marker.get("obsidian_revision") == revision:
            result.update({"status": "verified", "commit": marker.get("commit"),
                           "built_at": marker.get("built_at")})
        else:
            result["reason"] = "content_not_current"
    except Exception:
        result["reason"] = "verification_unavailable"
    return result

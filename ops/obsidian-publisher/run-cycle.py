#!/usr/bin/env python3
"""Export a read-only LiveSync snapshot, debounce changes, and publish approved files."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(os.environ.get("PUBLISHER_STATE_DIR", "/var/lib/obsidian-blog-publisher"))
BIN = Path("/opt/obsidian-blog-publisher")
STATE = ROOT / "status.json"


def write_state(state):
    state["checked_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    temporary = STATE.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2) + "\n")
    temporary.chmod(0o600)
    temporary.replace(STATE)


def run(args, environment, timeout):
    result = subprocess.run(args, env=environment, capture_output=True, timeout=timeout)
    if result.returncode:
        # Never forward dependency exceptions, credentials, or note content into shared logs.
        raise RuntimeError("step failed")
    return result


def main():
    ROOT.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        state = json.loads(STATE.read_text()) if STATE.exists() else {}
    except (ValueError, OSError):
        state = {}
    environment = dict(os.environ)
    environment.update({
        "LIVESYNC_READER_CONFIG": "/etc/obsidian-blog-publisher/reader.json",
        "LIVESYNC_EXPORT_ROOT": str(ROOT / "export"),
        "OBSIDIAN_BLOG_DIR": str(ROOT / "export/current/Blog"),
        "OBSIDIAN_PUBLISH_REPO": str(ROOT / "repository"),
        "NODE_NO_WARNINGS": "1",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_SSH_COMMAND": (
            "ssh -F /dev/null -i /etc/obsidian-blog-publisher/github_key "
            "-o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=15 "
            "-o UserKnownHostsFile=/etc/obsidian-blog-publisher/known_hosts "
            "-o StrictHostKeyChecking=yes"
        ),
    })
    stage = "export"
    try:
        run([str(BIN / "bin/node"), str(BIN / "reader.cjs")], environment, 120)
        manifest = json.loads((ROOT / "export/current/manifest.json").read_text())
        fingerprint = manifest["fingerprint"]
        state.update({"posts": manifest["posts"], "food": manifest.get("food", 0),
                      "gallery": manifest.get("gallery", 0), "attachments": manifest["attachments"],
                      "remote_writes": manifest["counters"]["blocked"]})
        if fingerprint != state.get("candidate"):
            state.update({"candidate": fingerprint, "candidate_since": time.time()})
        if fingerprint == state.get("published"):
            state.update({"healthy": True, "phase": "idle"})
        elif time.time() - state["candidate_since"] < 90:
            state.update({"healthy": True, "phase": "waiting_for_stability"})
        else:
            stage = "git_publish"
            run([str(BIN / "bin/node"), str(BIN / "publish.mjs")], environment, 240)
            commit = run(["git", "-C", str(ROOT / "repository"), "rev-parse", "HEAD"],
                         environment, 10).stdout.decode().strip()
            state.update({"healthy": True, "phase": "published", "published": fingerprint,
                          "commit": commit,
                          "published_at": datetime.datetime.now(datetime.timezone.utc).isoformat()})
        write_state(state)
        print(json.dumps({key: state[key] for key in ["phase", "posts", "food", "gallery", "attachments", "remote_writes"]}))
        return 0
    except Exception:
        state.update({"healthy": False, "phase": stage})
        write_state(state)
        print(f"Blog publisher failed at {stage}; preserving the last published version.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

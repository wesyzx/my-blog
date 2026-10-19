#!/usr/bin/env python3
"""Send deduplicated fault and recovery notifications through the existing Bark helper."""
import datetime
import json
from pathlib import Path
import subprocess

SOURCE = Path("/var/lib/obsidian-blog-publisher/status.json")
STATE = Path("/var/lib/obsidian-blog-alerts/state.json")


def notification(current, previous):
    healthy = current.get("healthy") is True
    failures = 0 if healthy else previous.get("failures", 0) + 1
    notified = previous.get("notified", False)
    title = body = None
    if not healthy and failures >= 3 and not notified:
        title = "Obsidian 博客发布异常"
        phase = {"export": "读取同步内容或校验文章", "git_publish": "提交博客仓库"}.get(current.get("phase"), "处理文章")
        body = f"服务器连续三次未能完成{phase}。线上保留上一版内容，笔记同步不受影响。"
    elif healthy and notified:
        title = "Obsidian 博客发布已恢复"
        body = "服务器自动发布任务已恢复正常。"
    return healthy, failures, notified, title, body


def main():
    try:
        current = json.loads(SOURCE.read_text())
    except (OSError, ValueError):
        current = {"healthy": False, "phase": "export"}
    result = subprocess.run(
        ["systemctl", "show", "obsidian-blog-publisher.service", "--property=Result", "--value"],
        capture_output=True, text=True, timeout=10,
    )
    if result.returncode or result.stdout.strip() != "success":
        current["healthy"] = False
    STATE.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        previous = json.loads(STATE.read_text()) if STATE.exists() else {}
    except (OSError, ValueError):
        previous = {}
    healthy, failures, notified, title, body = notification(current, previous)
    if title:
        try:
            delivered = subprocess.run(
                ["bash", "/opt/ecs-security/bark-notify-secure.sh", title, body, "active"],
                capture_output=True, timeout=45,
            ).returncode == 0
        except (OSError, subprocess.TimeoutExpired):
            delivered = False
        if delivered:
            notified = not healthy
            print("Bark accepted publisher status notification.")
        else:
            print("Bark delivery failed; retry on next run.")
    previous.update({"failures": failures, "notified": notified,
                     "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat()})
    temp = STATE.with_suffix(".tmp")
    temp.write_text(json.dumps(previous) + "\n")
    temp.chmod(0o600)
    temp.replace(STATE)


if __name__ == "__main__":
    main()

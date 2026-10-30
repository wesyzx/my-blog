#!/usr/bin/env python3
"""Send deduplicated fault and recovery notifications through the existing Bark helper."""
import datetime
import json
from pathlib import Path
import subprocess
from failure_reasons import describe_issue, issue_key

SOURCE = Path("/var/lib/obsidian-blog-publisher/status.json")
STATE = Path("/var/lib/obsidian-blog-alerts/state.json")


def notification(current, previous):
    healthy = current.get("healthy") is True
    key = list(issue_key(current))
    same_failure = previous.get("failure_key", key) == key
    failures = 0 if healthy else (previous.get("failures", 0) if same_failure else 0) + 1
    notified = previous.get("notified", False)
    # Upgrade an older generic alert once a specific cause is available.
    notified_key = previous.get("notified_key", key if key[1] == "unknown" else None)
    title = body = None
    if not healthy and failures >= 3 and (not notified or notified_key != key):
        title = "Obsidian 博客发布异常"
        phase = {"export": "读取同步内容或校验文章", "git_publish": "提交博客仓库"}.get(current.get("phase"), "处理文章")
        body = (f"服务器连续三次未能完成{phase}。\n原因：{describe_issue(current.get('error'))}"
                "\n线上保留上一版内容，笔记同步不受影响。")
    elif healthy and notified and current.get("phase") != "waiting_for_stability":
        title = "Obsidian 博客发布已恢复"
        body = "服务器自动发布任务已恢复，并已完成 GitHub 内容同步。"
        body += ("已核对线上页面内容版本。" if current.get("site", {}).get("status") == "verified"
                 else "正在等待核对网站页面更新。")
        if current.get("held_sections"):
            body += "空栏目暂时保留旧版，其他栏目继续同步。"
    return healthy, failures, notified, title, body


def additional_notice(current, previous):
    held = sorted(current.get("held_sections", []))
    key = {"held": held}
    if current.get("site", {}).get("status") == "delayed":
        key["delayed_revision"] = current.get("content_revision")
    if key == previous.get("notice_key") or not current.get("healthy"):
        return None, None, key
    if held:
        return ("博客部分栏目保留旧版",
                "源发布区有栏目变为空，已保留该栏目的旧公开副本及附件，其他栏目继续同步。请检查发布区；保护不会自动撤下最后一条内容。",
                key)
    if "delayed_revision" in key:
        return ("博客页面更新待确认",
                "GitHub 内容已提交超过 15 分钟，但仍未核实线上页面使用新版本。请检查网站构建；笔记与已提交内容均保留。",
                key)
    return None, None, key


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
        if current.get("healthy") is True:
            current.pop("error", None)
        current["healthy"] = False
    STATE.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        previous = json.loads(STATE.read_text()) if STATE.exists() else {}
    except (OSError, ValueError):
        previous = {}
    healthy, failures, notified, title, body = notification(current, previous)
    is_additional = False
    notice_title, notice_body, notice_key = additional_notice(current, previous)
    if title is None and notice_title:
        title, body, is_additional = notice_title, notice_body, True
    if title:
        try:
            delivered = subprocess.run(
                ["bash", "/opt/ecs-security/bark-notify-secure.sh", title, body, "active"],
                capture_output=True, timeout=45,
            ).returncode == 0
        except (OSError, subprocess.TimeoutExpired):
            delivered = False
        if delivered:
            if is_additional:
                previous["notice_key"] = notice_key
            else:
                notified = not healthy
                previous["notified_key"] = list(issue_key(current)) if not healthy else None
            print("Bark accepted publisher status notification.")
        else:
            print("Bark delivery failed; retry on next run.")
    elif notice_title is None and healthy:
        previous["notice_key"] = notice_key
    previous.update({"failures": failures, "notified": notified,
                     "failure_key": list(issue_key(current)) if not healthy else None,
                     "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat()})
    temp = STATE.with_suffix(".tmp")
    temp.write_text(json.dumps(previous) + "\n")
    temp.chmod(0o600)
    temp.replace(STATE)


if __name__ == "__main__":
    main()

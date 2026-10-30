"""Allowlisted public failure descriptions; never forward dependency error text."""

REASONS = {
    "images_type": "images 属性必须是列表",
    "images_source": "images 列表中有空值，或图片缺少有效的 src 地址。请检查列表中的每一项。",
    "frontmatter": "文章顶部的 YAML 属性格式错误。请检查缩进、冒号和引号。",
    "attachment_missing": "文章引用的本地附件不存在，或不在 Blog/attachments 发布目录内。",
    "attachment_conflict": "待保留栏目与新内容引用了同一路径但不同内容的附件。已保留现场，需要先处理附件命名冲突。",
    "sync_conflict": "文章或附件存在同步冲突，或版本尚未同步完整。请在 Obsidian 中处理冲突并完成同步。",
    "sync_size": "文件实际大小与同步记录不一致。请等待 LiveSync 同步完成后重试。",
    "source_changing": "导出期间同步数据库仍在变化，本轮无法取得稳定快照。",
    "no_content": "没有找到 published: true 的内容，发布器已阻止清空线上内容。",
    "empty_section": "该板块已没有已发布内容，触发了防止意外清空的保护，需要人工确认。",
    "attachment_size": "文章引用的单个附件超过 50 MiB 发布限制。",
    "blocked_write": "只读导出器检测到被禁止的数据库写入请求，已停止发布。",
    "git_branch": "发布仓库当前分支不是 main，自动发布已停止。",
    "git_diverged": "服务器发布仓库与 GitHub 分支已分叉，需要人工合并。",
    "git_dirty": "发布仓库中存在文章目录以外的未提交变更，需要先处理这些变更。",
    "git_push": "推送 GitHub 失败。请检查 GitHub 网络连接、仓库写入权限和分支状态。",
    "git_fetch": "读取 GitHub 最新提交失败。请检查网络连接和仓库访问权限。",
    "git_commit": "生成 Git 提交失败。请检查服务器磁盘空间和 Git 提交配置。",
    "git_merge": "无法快进更新 GitHub main 分支，需要人工检查仓库状态。",
    "publish_locked": "已有发布任务持有锁，本轮未能开始。请检查是否有任务长时间未退出。",
    "title_missing": "已发布文章缺少 title 标题属性。",
    "date_invalid": "文章的 date 属性格式错误，应为有效的 YYYY-MM-DD 日期。",
    "food_coordinates": "美食坐标 lng 和 lat 需要同时填写，并处于有效的经纬度范围内。",
    "network": "连接同步服务器失败，可能是网络、域名解析或连接超时。",
    "sync_auth": "同步数据库拒绝访问。请检查服务器读取凭据和数据库权限。",
    "timeout": "本步骤运行超时。请检查网络连接和服务器资源。",
    "unknown": "本步骤发生未分类错误，需要检查服务器受限诊断；通知不会转发原始异常内容。",
}
SECTIONS = {"posts": "博文", "food": "美食", "gallery": "相册"}
VALUE_TYPES = {"empty": "空值", "string": "文本", "number": "数字",
               "boolean": "布尔值", "object": "对象"}


def safe_issue(value):
    value = value if isinstance(value, dict) else {}
    code = value.get("code")
    issue = {"code": code if isinstance(code, str) and code in REASONS else "unknown"}
    section = value.get("section")
    if isinstance(section, str) and section in SECTIONS:
        issue["section"] = section
    kind = value.get("value_type")
    if issue["code"] == "images_type" and isinstance(kind, str) and kind in VALUE_TYPES:
        issue["value_type"] = kind
    return issue


def issue_key(current):
    issue = safe_issue(current.get("error"))
    return (current.get("phase"), issue["code"], issue.get("section"), issue.get("value_type"))


def describe_issue(value):
    issue = safe_issue(value)
    prefix = f"{SECTIONS[issue['section']]}板块：" if "section" in issue else ""
    reason = REASONS[issue["code"]]
    if issue["code"] == "images_type":
        kind = VALUE_TYPES.get(issue.get("value_type"), "非列表类型")
        reason += (f"，当前为{kind}。请移除不用的 images 属性，"
                   "或在源码模式改为 images: []（不要加引号）。")
    return prefix + reason

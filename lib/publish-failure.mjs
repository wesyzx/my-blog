import fs from "node:fs/promises";
var sections = /* @__PURE__ */ new Set(["posts", "food", "gallery"]);
var exactReasons = /* @__PURE__ */ new Map([
  ["Invalid image list", "images_type"],
  ["images \u5FC5\u987B\u662F\u56FE\u7247\u5730\u5740\u5217\u8868", "images_type"],
  ["Invalid image source", "images_source"],
  ["images \u4E2D\u7684\u56FE\u7247\u5730\u5740\u4E0D\u80FD\u4E3A\u7A7A", "images_source"],
  ["\u7F8E\u98DF\u5750\u6807\u9700\u8981\u540C\u65F6\u586B\u5199 lng \u548C lat", "food_coordinates"],
  ["\u7F8E\u98DF\u5750\u6807\u8D85\u51FA\u6709\u6548\u8303\u56F4", "food_coordinates"],
  ["A Blog article has invalid frontmatter", "frontmatter"],
  ["A published article references a missing attachment or one outside Blog/attachments", "attachment_missing"],
  ["An article or attachment has unresolved revisions", "sync_conflict"],
  ["Source changed or has unresolved conflicts; retry later", "sync_conflict"],
  ["File size differs from synchronized metadata", "sync_size"],
  ["Database changed during export; retry after synchronization settles", "source_changing"],
  ["No published content found; preserving the current site", "no_content"],
  ["The Vault Blog directory has no published content; refusing to erase the published copy", "no_content"],
  ["A referenced attachment exceeds the 50 MiB publishing limit", "attachment_size"],
  ["The official reader attempted a blocked write", "blocked_write"],
  ["Automatic publishing requires the main branch", "git_branch"],
  ["Repository diverged; manual reconciliation required", "git_diverged"],
  ["Repository diverged with uncommitted publication changes", "git_diverged"],
  ["A retained attachment conflicts with updated content", "attachment_conflict"]
]);
function publicationIssue(error, context = {}) {
  const message = typeof error?.message === "string" ? error.message : "";
  let code = exactReasons.get(message);
  let section = context.section;
  const empty = message.match(/^Refusing to empty the existing (posts|food|gallery) publication without manual review$/);
  if (empty) {
    code = "empty_section";
    section = empty[1];
  }
  if (!code) {
    if (message.startsWith("Refusing to publish while other repository files are dirty:")) code = "git_dirty";
    else if (message.startsWith("Publish lock is already held:")) code = "publish_locked";
    else if (message.startsWith("git push ")) code = "git_push";
    else if (message.startsWith("git fetch ")) code = "git_fetch";
    else if (message.startsWith("git commit ")) code = "git_commit";
    else if (message.startsWith("git merge ") || message.startsWith("git rebase ")) code = "git_merge";
    else if (/frontmatter 解析失败/.test(message)) code = "frontmatter";
    else if (/缺少 YAML frontmatter/.test(message)) code = "frontmatter";
    else if (/title 不能为空/.test(message)) code = "title_missing";
    else if (/date 必须是 YYYY-MM-DD/.test(message)) code = "date_invalid";
    else if (/找不到附件|附件不在 Blog 发布区|不在 Blog 发布区内，请移动到/.test(message)) code = "attachment_missing";
    else if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "ECONNRESET"].includes(error?.code)) code = "network";
    else if ([401, 403].includes(error?.status)) code = "sync_auth";
    else code = "unknown";
  }
  const issue = { code };
  if (sections.has(section)) issue.section = section;
  if (code === "images_type" && Object.hasOwn(context, "images")) {
    issue.value_type = context.images == null ? "empty" : typeof context.images;
  }
  return issue;
}
async function recordPublicationIssue(error, context) {
  const target = process.env.OBSIDIAN_PUBLISH_FAILURE_FILE;
  if (!target) return;
  await fs.writeFile(target, JSON.stringify(publicationIssue(error, context)), { mode: 384 });
}


export { publicationIssue, recordPublicationIssue };

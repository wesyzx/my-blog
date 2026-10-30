# 轨道之外

个人博客，生产分支为 `main`。

## 项目结构

- `app/`、`components/`、`lib/`：Next.js 主站，部署于 EdgeOne。
- `scripts/bundle-data.mjs`：生成内容快照；博文与美食来自 Obsidian，相册合并 Obsidian 和 iPhone 发布到 R2 的相册。`content/about.md` 管理关于页。
- `cloudflare/workouts/`：运动数据 Worker、D1 迁移与测试，是运动页面的数据服务。
- `cloudflare/images/`：Blog 图片 WebP 转换，以及需要 bearer token 的相册上传/发布接口。
- `cloudflare/gallery/`：从 iPhone 照片相簿发布博客相册的快捷指令生成器。
- `cloudflare/workouts/shortcuts/`：三个正式运动快捷指令及生成器，日常使用见该目录的 README。
- `scripts/import-apple-health.py`：Apple 健康历史数据批量导入工具。
- `docs/`：灯箱说明与保留的主题设计提案。

主站和 Worker 分别部署。旧的 `ios/WorkoutSync` 工程已由快捷指令替代，代码保留在 Git 历史中。

## 本地开发

```bash
npm ci
# 按 .env.example 配置 .env.local
npm run dev
```

开发与构建前会同步内容；内容源暂时不可用时沿用已提交的快照。
美食地图使用浏览器端的 `NEXT_PUBLIC_TMAP_KEY`；修改部署环境后重新部署，修改本地配置后重启服务。

## 验证

```bash
npm run check
npm test
npm run check --prefix cloudflare/workouts
npm test --prefix cloudflare/workouts
pnpm test --prefix cloudflare/images
pnpm test --prefix cloudflare/gallery
npm run build
```

仅验证现有内容快照的生产构建时，使用 `npm run build --ignore-scripts` 跳过内容同步。

运动服务部署、接口与导入说明见 `cloudflare/workouts/README.md`；图片放大交互见 `docs/lightbox.md`。

## Obsidian 内容发布

发布区只允许是 Obsidian Vault 内的 `Blog/`，不要指向整个私人 Vault：

```text
Blog/
  posts/*.md
  food/*.md
  gallery/*.md
  attachments/
  templates/       # 草稿模板，不对外发布
```

文章的 frontmatter：

```yaml
---
published: true
slug: example
title: 示例文章
date: 2026-10-19
category: 技术
tags:
  - Obsidian
excerpt: 摘要
cover: ""
---
```

先用隔离预览验证，不会覆盖 `lib/data-bundle.ts`：

```bash
OBSIDIAN_BLOG_DIR="/path/to/Obsidian/Blog" \
npm run obsidian:preview
```

仓库的 `content/source.json` 已将博文、美食设为 Obsidian，相册设为 `hybrid`；`CONTENT_SOURCE` 可覆盖博文来源，
`FOOD_CONTENT_SOURCE` 和 `GALLERY_CONTENT_SOURCE` 可分别覆盖美食与相册来源，留空使用仓库配置。
三个板块全部使用 Obsidian 时，构建不再请求 Notion。
默认读取仓库内 `content/obsidian`，该目录只保存已批准发布的副本，不包含私人 Vault 或草稿。
构建时只复制已发布文章实际引用到的附件到 `public/obsidian`，正文中的本地附件会改写成
`/obsidian/attachments/...`。未发布的文章和未被引用的附件不会进入博客仓库。该目录会镜像同步：
删除或取消发布文章后，下次构建会清理对应副本。

### 服务器自动发布

服务器每分钟只读检查同一 LiveSync 数据库。`Blog/posts/*.md`、`Blog/food/*.md` 和
`Blog/gallery/*.md` 中 `published: true` 的内容及其引用的 `Blog/attachments/` 附件稳定 90 秒后，
自动提交到 GitHub `main`，
由现有 EdgeOne Git 集成构建。Mac 关机不影响此流程；iPhone 需保持 Obsidian 打开，直到 LiveSync 上传完成。
同一数据库的解密密钥保存在服务器受限配置目录，具备读取整个 Vault 的能力；
发布白名单由只读导出器执行，未发布文章和私人文件不会进入公开仓库。

任务、权限、通知与恢复说明见 `ops/obsidian-publisher/README.md`。

美食与相册也使用 `published`、`slug`、`title`、`date`、`excerpt`、`cover`。
美食增加 `location`、`address`、`tags`，坐标为 WGS84 的 `lng` 与 `lat`，需要成对填写，
也可同时留空（优先复用已有坐标，配置高德 Key 后可查询新地点）。
相册增加 `category`（默认「日常」），直接把图片插入正文即可，也支持 frontmatter
中的 `images` 地址列表。本地图片自动读取真实尺寸；未指定封面时使用第一张图片。
iPhone 发布的 R2 相册会与这些 Obsidian 相册合并，原有相册不需要迁移。使用方式见
`cloudflare/gallery/README.md`；R2 相册先在 Worker 中保持私密，最后发布时才进入网站清单并触发 EdgeOne 构建。
同名文件可分别放在不同板块中，链接和 slug 分别按板块处理。
某个板块撤下最后一条已发布内容时，服务器保留该板块的旧公开副本及引用附件，
明确提示需要检查，并继续更新其他板块。三个板块全部为空时仍停止发布。
真正清空板块需要维护操作，不会因一次空同步自动删除旧公开内容。
只有发布器自己生成的待推送内容提交，遇到远端未改动发布目录的网站更新时，
才会自动重放并普通推送；发布目录被另一方改动时仍停止，不会强制覆盖。

GitHub 提交成功与网站上线分别检查。服务器记录 `git_status`、`held_sections`、
`effective_counts` 和 `site.status`；网站构建生成不含私人笔记的 `/publish-status.json`，
供服务器核对已部署的内容摘要。超过 15 分钟未核实新版本时标记为待检查。
手机相册发布后打开独立状态页，同时核对构建记录和实际相册页面，确认后才显示“已上线”。
R2 清单读取失败时默认停止本次构建；本地离线预览可显式设置 `GALLERY_ALLOW_STALE=1`，
这种旧快照不会被标记为新相册已上线。

### 本地手动发布（维护用途）

将 Vault 的 `Blog` 目录作为唯一来源，运行一次手动同步：

```bash
OBSIDIAN_BLOG_DIR="$HOME/Library/Application Support/Obsidian-Local/Vaults/Obsidian LiveSync/Blog" \
npm run obsidian:publish
```

发布器只读取三个发布目录和 `Blog/attachments`，先校验所有已发布内容的 frontmatter 与附件引用，
再把文章和实际引用的附件镜像到 `content/obsidian`。它不会提交草稿、私人笔记或未被引用的附件。
有变化时自动提交并推送到 `main`；仓库在工作区不干净、来源不是 `Blog` 或没有已发布文章时会拒绝运行。
可用 `-- --dry-run` 只做校验，用 `-- --no-push` 只提交不推送。

自动发布仅使用服务器定时器。旧的 Mac 后台安装脚本已移除，避免意外启用重复发布任务。

若附件已经放在其他 HTTPS 静态存储中，可用 `OBSIDIAN_ATTACHMENT_BASE_URL` 覆盖 `/obsidian`；
该地址只用于生成文章中的 URL；构建仍会镜像已发布文章引用的附件，避免站点资源与文章指向脱节。
LiveSync 在服务器上保存的是端到端加密块，不能直接作为图片目录公开。

日常在 Obsidian 中写作时，可把本地的 `OBSIDIAN_BLOG_DIR` 临时指向 Vault 内的 `Blog/`。
发布到 Git/EdgeOne 时只同步 `content/obsidian` 这一份发布副本；不要把完整的私人 Vault
或草稿提交到仓库。

### Obsidian 统一管理入口

`obsidian/blog-create/` 是可安装的本地 Obsidian 插件。它在侧栏分别提供新建博文、美食、
相册，以及查看和删除 iPhone 快捷指令相册的入口。相册上传令牌首次验证后会保存在插件
本地的 `data.json` 配置中，便于后续直接使用；令牌不会进入博客源码仓库。安装与更新方法见
[`obsidian/blog-create/README.md`](obsidian/blog-create/README.md)。

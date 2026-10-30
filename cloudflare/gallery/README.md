# iPhone 相簿同步到博客

公开快捷指令 [`相册同步到博客.shortcut`](./shortcuts/相册同步到博客.shortcut)
打开系统照片选择器，把手动选中的静态图片直接上传到博客相册，
最后发布并触发 EdgeOne 构建。

## 日常用法

1. 运行“相册同步到博客”。
2. 在系统照片选择器中勾选准备公开的照片。需要从某个相簿中挑选时，点选择器底部
   的“相簿”，先进入该相簿再选择；共享相簿不用于发布。
3. 输入照片日期（`YYYY-MM-DD`），默认已经填好当天日期。补传旧照片时改成拍摄日期；
   这个日期决定相册在首页、归档中的位置，以及 R2 文件路径里的年/月目录。
4. 输入博客相册标题和英文链接短名，例如 `tuotuo-first-month`。短名留空时自动命名；
   中文标题默认使用 `album`、`album-2` 等。公开版还会询问上传令牌；个人版已内置令牌。
5. 等快捷指令完成。它会显示发布响应，并打开相册发布状态页。
   状态页区分“相册已提交”“网站构建已触发”和“页面已更新”，最后一项需要核对实际页面。
   确认上线后点击“查看相册”。已安装的个人版也会打开状态页，无需重新导入。

快捷指令每张图片都会先转成 JPEG。这样普通 Cloudflare Images 方案也能处理 iPhone
常见的 HEIC 原片；Worker 也预留了 Enterprise 方案的 HEIC/HEIF 上传格式。单次最多
100 张、单张最多 20 MiB，这是服务端与 Cloudflare Images 的硬限制。超限时请先分批。

上传中的相册不会出现在网站。只有最后的 `/publish` 成功时才进入公开清单；部署
webhook 失败会撤回公开状态。照片按文件名顺序生成公开的 WebP 变体，灯箱仍可查看
完整长边版本。`cloudflare/images/` 里的 Worker 负责这些接口和转换。

## 查看和删除相册

打开 `https://img.215320.xyz/internal/gallery/admin`，输入快捷指令使用的
`GALLERY_UPLOAD_TOKEN` 后可以查看私密和已发布相册。删除已发布相册时会先隐藏相册并
触发 EdgeOne 更新；如果部署请求失败，相册和照片会恢复。令牌只保存在当前网页内存中，
刷新页面后需要重新输入。

Obsidian 的 `Blog Create` 插件也提供同一个管理入口。令牌只保存在当前 Obsidian 会话内，
不会写入 Vault、LiveSync 或 Git。

## 首次部署

先在 Cloudflare Worker 配置两个 secret：

```sh
pnpm dlx wrangler@latest secret put GALLERY_UPLOAD_TOKEN --config cloudflare/images/wrangler.jsonc
pnpm dlx wrangler@latest secret put EDGEONE_DEPLOY_WEBHOOK --config cloudflare/images/wrangler.jsonc
pnpm dlx wrangler@latest deploy --config cloudflare/images/wrangler.jsonc
```

`GALLERY_UPLOAD_TOKEN` 应是至少 32 字节的随机值，不能写进仓库或公开快捷指令。
`EDGEONE_DEPLOY_WEBHOOK` 使用 EdgeOne 项目的部署 webhook。Worker 路由覆盖
`img.215320.xyz/*`；相册写入接口认证由 bearer token 负责。部署前创建
`blog-images`、`blog-system`、`blog-archive` 三个 R2 桶，后两者保持私有。

Obsidian 和 iPhone 原图统一放在 `blog-images/blog/obsidian/年/月/`；
相册记录放在 `blog-system`，历史杂项放在 `blog-archive`。保留 Obsidian 自动上传
与替换链接的现有设置；不要把目录占位符直接填入不支持模板的上传路径字段。

部署 Worker 后再部署博客。博客构建从
`https://img.215320.xyz/webp/gallery-manifest` 读取公开清单；清单不可用时停止本次构建，
避免用旧快照覆盖新相册。仅本地离线预览可设置 `GALLERY_ALLOW_STALE=1`。

发布接口返回 `stage: build_requested`，只代表部署请求已接受。
`url` 和 `statusUrl` 为状态页，`albumUrl` 是正式相册链接。状态页
`/webp/gallery-status/{albumId}` 仅对已公开相册可用，JSON 状态使用 `?format=json`。
它同时核对网站的 `/publish-status.json` 和相册实际页面的版本，
只有二者均与 R2 当前相册一致才返回 `stage: site_updated`。

## 重新生成和签名

公开版不含上传令牌，每次运行都会询问：

```sh
python3 cloudflare/gallery/shortcuts/build.py --output-dir /private/tmp/gallery-shortcut-build
shortcuts sign --mode anyone \
  --input /private/tmp/gallery-shortcut-build/相册同步到博客-unsigned.shortcut \
  --output cloudflare/gallery/shortcuts/相册同步到博客.shortcut
```

个人版可以把令牌内联，避免每次输入。生成器强制把它写到
`/private/tmp/personal-gallery-shortcuts/`，目录权限为 `0700`，文件权限为 `0600`：

```sh
GALLERY_UPLOAD_TOKEN="实际令牌" \
python3 cloudflare/gallery/shortcuts/build.py --personal
```

不要把个人版快捷指令从私有目录复制到仓库或发给他人。若要分发给别人，只能使用
公开版；它会要求每位使用者提供自己的令牌。

重新导入前先删除“快捷指令”App 中同名的旧版本，否则系统可能保留旧版本。公开指令
可以在 Mac 上直接双击 `.shortcut` 文件安装到 iCloud 同步的快捷指令库，再在 iPhone
上运行。

## 回滚

1. 停止使用快捷指令，不再创建新相册。
2. 将 `content/source.json` 的 `gallery` 改回 `obsidian`，即可立即排除所有 R2 相册；
   原有 Obsidian 相册不会受影响。
3. 如需回滚 Worker，恢复部署前已记录的 Cloudflare Worker 版本。R2 原图与相册记录
   不必删除，方便恢复后继续使用。

## 验证

```sh
pnpm test --prefix cloudflare/images
pnpm test --prefix cloudflare/gallery
node --test test/bundle-data.test.mjs
```

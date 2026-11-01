# iPhone 相簿和视频同步到博客

公开快捷指令 [`相册同步到博客.shortcut`](./shortcuts/相册同步到博客.shortcut)
打开系统照片选择器，把手动选中的静态图片直接上传到博客相册，
最后发布并触发 EdgeOne 构建。

公开快捷指令 [`视频同步到博客.shortcut`](./shortcuts/视频同步到博客.shortcut)
使用同一套流程发布视频；选择器只显示视频，博客中的原生播放器可以直接播放，
也支持拖动进度条和按需加载。

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

图片和视频可以分别发布，也可以连续上传到同一个相册。运行“视频同步到博客”，在系统
选择器中选择视频，再填写与图片版相同的日期、标题和链接短名即可。视频会先在手机上
转成 H.264/AVC，再以 QuickTime/MOV 上传；长边最高 1920，竖屏视频的宽高比保持不变。
H.264 在 Edge、Chrome、Safari 和常见手机浏览器中兼容性最好。单次相册仍以 100 个
项目为上限，单个视频最多 100 MiB。
博客使用浏览器原生 `<video>` 播放器，不把视频送进图片灯箱；视频不会计入图片灯箱的
“第几张照片”。Worker 会读取 QuickTime/MP4 视频轨道中的显示宽高；竖屏视频按纵向画框
显示，已有的错误横屏元数据也会由页面在视频载入后自动校正。

旧版快捷指令会原样上传 iPhone 的 HEVC/H.265 视频，而 Edge、Chrome 和 Windows 通常
无法解码，因此只能看到模糊预览并停在 `0:00`。已发布相册不可修改，旧版上传的 HEVC
视频不会因更新快捷指令而自动修复。请在相册管理中删除旧相册（会同时删除其中所有图片
和视频），重新导入新版“视频同步到博客”后再次上传；也可以在手机上先导出为 H.264
视频，再发布到新相册。Safari 能播放旧文件不代表其他浏览器也能播放。

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

通过 Obsidian 接管的相册不在这里永久删除。博客新版本核对成功后，服务器会保护所有
仍被笔记或草稿引用的媒体，并只清理上传超过 15 天且无人引用的 R2 文件。管理插件中的
“检查 R2 孤立文件”可先查看清单再确认删除。

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

生成器中的上传文件参数必须使用原生 `WFTextTokenAttachment`，指向转换图像或编码媒体
动作的输出。使用文本 token 会在导入后显示“选取变量”，并发送空正文。
“显示结果”动作的内容参数为 `Text`；错用 `WFInput` 会隐藏错误信息。
修改生成器后，除运行测试外，还应在 iPhone 上各选一张测试图和一个测试视频，
确认上传、状态页及正式页面的 `site_updated` 结果；仅导入成功不能证明上传可用。

公开版不含上传令牌，每次运行都会询问：

```sh
python3 cloudflare/gallery/shortcuts/build.py --output-dir /private/tmp/gallery-shortcut-build
shortcuts sign --mode anyone \
  --input /private/tmp/gallery-shortcut-build/相册同步到博客-unsigned.shortcut \
  --output cloudflare/gallery/shortcuts/相册同步到博客.shortcut
```

视频版使用相同流程，生成时增加 `--media video`，并替换文件名：

```sh
python3 cloudflare/gallery/shortcuts/build.py \
  --media video \
  --name 视频同步到博客 \
  --output-dir /private/tmp/gallery-shortcut-build
shortcuts sign --mode anyone \
  --input /private/tmp/gallery-shortcut-build/视频同步到博客-unsigned.shortcut \
  --output cloudflare/gallery/shortcuts/视频同步到博客.shortcut
```

个人版可以把令牌内联，避免每次输入。生成器强制把它写到
`/private/tmp/personal-gallery-shortcuts/`，目录权限为 `0700`，文件权限为 `0600`：

```sh
GALLERY_UPLOAD_TOKEN="实际令牌" \
python3 cloudflare/gallery/shortcuts/build.py --personal

GALLERY_UPLOAD_TOKEN="实际令牌" \
python3 cloudflare/gallery/shortcuts/build.py --personal --media video
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

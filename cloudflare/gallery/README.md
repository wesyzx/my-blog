# iPhone 相簿同步到博客

公开快捷指令 [`相册同步到博客.shortcut`](./shortcuts/相册同步到博客.shortcut)
打开系统照片选择器，把手动选中的静态图片按拍摄时间从旧到新上传到博客相册，
最后发布并触发 EdgeOne 构建。

## 日常用法

1. 运行“相册同步到博客”。
2. 在系统照片选择器中勾选准备公开的照片。需要从某个相簿中挑选时，点选择器底部
   的“相簿”，先进入该相簿再选择；共享相簿不用于发布。
3. 输入博客相册标题。公开版还会询问上传令牌；个人版已内置令牌。
4. 等快捷指令完成。它会显示发布响应，并打开新相册的网址。

快捷指令每张图片都会先转成 JPEG。这样普通 Cloudflare Images 方案也能处理 iPhone
常见的 HEIC 原片；Worker 也预留了 Enterprise 方案的 HEIC/HEIF 上传格式。单次最多
100 张、单张最多 20 MiB，这是服务端与 Cloudflare Images 的硬限制。超限时请先分批。

上传中的相册不会出现在网站。只有最后的 `/publish` 成功时才进入公开清单；部署
webhook 失败会撤回公开状态。照片按文件名顺序生成公开的 WebP 变体，灯箱仍可查看
完整长边版本。`cloudflare/images/` 里的 Worker 负责这些接口和转换。

## 首次部署

先在 Cloudflare Worker 配置两个 secret：

```sh
pnpm dlx wrangler@latest secret put GALLERY_UPLOAD_TOKEN --config cloudflare/images/wrangler.jsonc
pnpm dlx wrangler@latest secret put EDGEONE_DEPLOY_WEBHOOK --config cloudflare/images/wrangler.jsonc
pnpm dlx wrangler@latest deploy --config cloudflare/images/wrangler.jsonc
```

`GALLERY_UPLOAD_TOKEN` 应是至少 32 字节的随机值，不能写进仓库或公开快捷指令。
`EDGEONE_DEPLOY_WEBHOOK` 使用 EdgeOne 项目的部署 webhook。Worker 路由必须覆盖
`img.215320.xyz/webp/*` 和 `img.215320.xyz/internal/gallery/*`；认证由 bearer token
负责。

部署 Worker 后再部署博客。博客构建从
`https://img.215320.xyz/webp/gallery-manifest` 读取公开清单；清单不可用时沿用上一版
构建中已有的 R2 相册，Obsidian 相册照常读取。

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

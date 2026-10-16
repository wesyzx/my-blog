# PhotoSwipe 5 灯箱

## 接入方式

- `ImageLightbox` 保留原来的容器接口，增强容器内的图片，不改变正文或网格结构。
- 博文、美食正文继续通过服务端 `MDXRemote` 渲染；`MarkdownImage` 为 Markdown 图片提供预览。
- 相册保留 `react-photo-album` 排版，预览复用 `next/image`，点击后使用共享灯箱。
- 短记和美食多图继续使用现有组件、图片链接和 Memos 文件代理。
- 已移除 `yet-another-react-lightbox`，使用 `photoswipe@5.4.4`。

## 加载与图片地址

PhotoSwipe 的脚本和 CSS 在图片悬停、获得焦点或点击时动态加载。提前准备查看器不会请求高清图。打开后由 PhotoSwipe 加载当前图，并预加载前后各一张；不同容器的图片不会混为一组。

Markdown 中现有 `*.guanyan.me` 的 HTTPS 图片复用 Next.js 的图片优化生成响应式预览，不添加 CDN 处理规则或修改 CDN 配置。未知外部来源、已有 `srcSet` 的图片保留原地址；历史 MDX 中显式书写的原生 `<img>` 保留原来的渲染方式，也可被灯箱识别。

原图地址优先使用 `data-lightbox-src`，其次恢复 `/_next/image` 内的原始地址，或使用图片链接、最大 `srcset` 候选、图片自身地址。所有原图查询参数保持完整。原图加载完成后，从同一次请求读取真实尺寸，校正旧元数据和预览尺寸，不额外请求图片尺寸接口。

可选属性：

- `data-lightbox-src`：指定高清图片地址。
- `data-pswp-width`、`data-pswp-height`：已知原图尺寸；缺失时可正常打开并在加载后校正。
- `data-lightbox="off"`：图片或祖先元素退出灯箱。

说明文字优先使用 `figcaption`，其次为图片 `title`、`alt`，通过 `textContent` 输出。普通页面导航图片保持链接行为；图片链接仍保留修改键点击和无 JavaScript 时的原生行为。裸图片支持 Tab 聚焦、Enter/空格打开；查看器支持方向键、Esc 和关闭后恢复焦点，并响应减少动画偏好。

## 本地验证记录

验证日期：2026-10-16。

通过：

- `npm run check`：TypeScript 与 ESLint，零错误、零警告。
- `npm run build`：包含原有内容同步流程的 Webpack 生产构建成功，静态页面生成成功。
- 桌面 Chrome：打开与关闭动画、方向键切换、工具栏缩放、Enter/空格打开、Esc/关闭按钮关闭、焦点恢复。
- iPhone 13 尺寸与触摸模拟：通过 Chrome 多指触摸事件验证双指缩放、左右滑动、纵向拖动关闭、横屏适配。
- 历史内容：普通 Markdown、原生 MDX 图片、图注、竖图、旧尺寸校正、图片链接、外部地址、动态插入图片、独立图片组、退出灯箱属性。
- 异常与可访问性：图片加载错误提示、空说明、图注按文本输出、无 JavaScript 正文及链接、减少动画偏好。
- 请求检查：优化预览不提前请求原图，打开后只请求当前及相邻原图，查询参数保留。
- 页面切换：打开动画中离开页面后，查看器可清理。
- 现有相册与短记页面：开发与生产模式均验证共享灯箱、缩略图布局及 Memos 代理地址。
- 生产按需加载：浏览器请求和构建清单共同确认 PhotoSwipe 的两个 JS 文件及 CSS 在图片交互后才加载。

由于本地内容快照没有已发布博文，Markdown/MDX 用临时测试页面验证；该页面已移除，不包含在最终生产构建中。交互测试使用受控图片响应，未在实体 iPhone 或 iOS Safari 上验证。

## 验证时发现的既有问题

- 现有相册地址 `https://images.guanyan.me/IMG_7764.JPG` 返回 HTTP 200，但类型为 JSON，内容为 `{"code":501,"status":false,"message":"找不到API","data":null}`。这阻断了真实 CDN 原图的端到端验证；未修改域名、回源、缓存或 CDN 配置。
- `RunningTime` 在服务端与浏览器取当前时间，秒数跨界时有既有水合警告；未修改该组件。
- 当前环境缺少 `MEMOS_TOKEN`，构建及短记读取按照既有逻辑沿用内容快照；未修改令牌配置。
- 默认 Turbopack 开发模式无法解码仓库现有 `favicon.ico`。本次使用与项目生产构建一致的 Webpack 模式验证；未修改图标。

本次实现未修改 CDN 配置，未执行部署。工作区已有的运动快捷指令改动保持原样。

# 运动快捷指令

这些文件把 Apple 健康的运动数据上传到博客的 `workouts.wesyzx.workers.dev`，替代原来的自建 iOS App。所有生成文件都不包含健康数据或上传令牌；令牌只在指令运行时询问。

## 文件

- `actions-template.plist`：从该 iPhone 导出的 `Find Workout` 动作描述、属性标识和枚举元数据，不含实际健康值。
- `build.py`：生成 6 个未签名指令到 `/private/tmp`。
- `*.shortcut`：已签名的成品，用 Mac“快捷指令 → 文件 → 导入”安装后经 iCloud 同步到 iPhone。

摘要类（读取热量、时长等，走 `/internal/healthkit`）：

| 指令 | 用途 |
| --- | --- |
| 预览最近运动上传数据 | 只读最近一条运动并预览字段，不联网 |
| 预览运动上传数据 | 多选运动后逐条预览字段，不联网 |
| 同步最近运动到博客 | 读取最近一条运动并上传 |
| 同步运动到博客 | 多选运动后逐条上传 |

轨迹类（走 `/internal/route`）：

| 指令 | 用途 |
| --- | --- |
| 预览运动轨迹文件 | 用“文件”动作选择 `.gpx` 并预览，不联网 |
| 上传运动轨迹到博客 | 选择 `.gpx` 上传，Worker 按文件内时间戳自动匹配运动 |

轨迹类不需要输入 UUID 或开始时间：Worker 读取 GPX 内第一个 `<time>`，在已有运动里按最近时间匹配，容差 30 分钟以吸收 GPS 首次定位延迟。响应里的 `matchedBy` 会说明匹配方式（`id` / `startedAt` / `gpx-time`），`workoutStartedAt` 是最终匹配到的运动开始时间。健康 App 已测到的时长、热量优先，GPX 只补轨迹、距离和爬升。

## 生成与签名

```bash
python3 cloudflare/workouts/shortcuts/build.py
shortcuts sign --mode anyone \
  --input "/private/tmp/上传运动轨迹到博客-unsigned.shortcut" \
  --output cloudflare/workouts/shortcuts/上传运动轨迹到博客.shortcut
```

签名依赖 macOS 快捷指令服务。若 `shortcuts sign` 报“文件格式不正确”，通常是签名助手没有响应；先 `open -a Shortcuts` 让应用进入前台，再重试即可。

## 验收状态

摘要类：单条与多选两条流程都已在真机跑通，重复上传同一 UUID 不新增记录。Actions 的属性面板只暴露 `id`、`workoutType`、`startDate`、`duration`、`activeCalories`，没有找到心率或最大心率属性，因此爬楼等运动在这条路径下可能没有心率；旧 App 上传的历史心率不受影响。

轨迹类：文件已签名，后端 `/internal/route` 已部署并有测试覆盖；但尚未在真机导入运行，也没有带 GPS 的真实运动做端到端验证。上传返回内容必须包含 `ok: true`，不能仅凭流程结束判断成功。

## 已知的序列化要点

- 日期动作的 `WFDate` 变量必须用 `WFTextTokenString`，用 `WFTextTokenAttachment` 会显示为空日期。
- 时长是测量值，需用 `WFCoercionVariableAggrandizement` / `WFNumberContentItem` 取无单位数字，不能把带“秒”的文本直接发给接口。
- 上传轨迹用 `is.workflow.actions.file`（`WFFile = {Type: Ask}`）选文件，配合 `downloadurl` 的 `WFHTTPBodyType = File` 把文件直接作为请求体。

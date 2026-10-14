# 运动快捷指令

这些文件把 Apple 健康的运动数据上传到博客的 `workouts.wesyzx.workers.dev`，替代原来的自建 iOS App。所有生成文件都不包含健康数据或上传令牌；令牌只在指令运行时询问。

## 文件

- `actions-template.plist`：从该 iPhone 导出的 `Find Workout` 动作描述、属性标识和枚举元数据，不含实际健康值。
- `build.py`：生成 6 个未签名指令到 `/private/tmp`。
- `*.shortcut`：已签名的成品，用 Mac“快捷指令 → 文件 → 导入”安装后经 iCloud 同步到 iPhone。

摘要类（读取热量、时长、心率，走 `/internal/healthkit`）：

| 指令 | 用途 |
| --- | --- |
| 预览最近运动上传数据 | 只读最近一条运动（含平均/最大心率）并预览，不联网 |
| 预览运动上传数据 | 多选运动后逐条预览，不联网 |
| 同步最近运动到博客 | 读取最近一条运动并上传 |
| 同步运动到博客 | 多选运动后逐条上传 |

轨迹类（走 `/internal/route`）：

| 指令 | 用途 |
| --- | --- |
| 预览运动轨迹文件 | 用“文件”动作选择 `.gpx` 并预览，不联网 |
| 上传运动轨迹到博客 | 选择 `.gpx` 上传，Worker 按文件内时间戳自动匹配运动 |

轨迹类不需要输入 UUID 或开始时间：Worker 读取 GPX 内第一个 `<time>`，在已有运动里按最近时间匹配，容差 30 分钟以吸收 GPS 首次定位延迟。响应里的 `matchedBy` 会说明匹配方式（`id` / `startedAt` / `gpx-time`），`workoutStartedAt` 是最终匹配到的运动开始时间。健康 App 已测到的时长、热量优先，GPX 只补轨迹、距离和爬升。

## 心率来源

Actions 的 `Find Workout` 只暴露 `id`、`workoutType`、`startDate`、`duration`、`activeCalories`，没有心率属性，所以心率改由苹果原生动作补齐：

1. `Adjust Date`：运动开始时间加上运动时长，得到运动结束时间。
2. `Find Health Samples`：类型为“心率”，`Start Date` 落在 [开始, 结束] 区间内。
3. `Get Details of Health Sample`：取每条样本的 `Value`。
4. `Calculate Statistics`：分别计算 `Average` 与 `Maximum`。

结果写入 `averageHeartRateBpm` / `maxHeartRateBpm`，与热量、时长在同一次 `/internal/healthkit` 请求里上传。心率按运动时段取样，不使用全天数据。若健康 App 未允许“快捷指令”读取数据，样本为空，统计返回 0；后端把非正数视为未测量，页面不会显示 `0 bpm`。

首次运行会在手机上弹出健康数据授权，需要允许读取“心率”。授权位置：健康 App → 右上角头像 → App → 快捷指令 → 打开“允许快捷指令读取数据”。

## 生成与签名

```bash
python3 cloudflare/workouts/shortcuts/build.py
shortcuts sign --mode anyone \
  --input "/private/tmp/上传运动轨迹到博客-unsigned.shortcut" \
  --output cloudflare/workouts/shortcuts/上传运动轨迹到博客.shortcut
```

签名依赖 macOS 快捷指令服务。若 `shortcuts sign` 报“文件格式不正确”，通常是签名助手没有响应；先 `open -a Shortcuts` 让应用进入前台，再重试即可。

## 验收状态

摘要类：不含心率的单条与多选上传已在真机跑通，重复上传同一 UUID 不新增记录。2026-10-15 已在健康 App 中开启“快捷指令 → 心率”读取权限，新版最近运动预览能够完成，但平均/最大心率仍为空；手机编辑器中的日期动作实际显示“添加 0 秒”。因此心率补齐尚未通过验收，不能根据空结果判断原运动没有心率。需修正日期参数、核对运动起止时间后重测；尚未用修正后的心率重新上传。

2026-10-15 已检查线上 `/workouts`：10 月 14 日爬楼显示 38 分钟、248 kcal，隐藏无测量的距离、配速和心率；9 月 29 日的既有心率仍显示 134 bpm。前端隐藏缺失指标的改动已经上线。

轨迹类：文件已签名，后端 `/internal/route` 已部署并有测试覆盖；Mac 端已导入，尚未在带 GPS 的真实运动上做端到端验证。上传返回内容必须包含 `ok: true`，不能仅凭流程结束判断成功。

## 已知的序列化要点

- 日期动作的 `WFDate` 变量必须用 `WFTextTokenString`，用 `WFTextTokenAttachment` 会显示为空日期。
- 时长是测量值，需用 `WFCoercionVariableAggrandizement` / `WFNumberContentItem` 取无单位数字，不能把带“秒”的文本直接发给接口。
- 上传轨迹用 `is.workflow.actions.file`（`WFFile = {Type: Ask}`）选文件，配合 `downloadurl` 的 `WFHTTPBodyType = File` 把文件直接作为请求体。
- 当前 `Adjust Date` 同时写了 `WFAdjustOffsetPicker`（`WFTimeOffsetValue`）和 `WFDuration`（`WFQuantityFieldValue`），但 2026-10-15 真机仍显示“添加 0 秒”；该编码尚未验证成功，不能作为可复用的正确模板。
- 健康筛选器的日期区间用 `Operator = 1003`，`Values.Date` 是下界、`Values.AnotherDate` 是上界，两者都是变量引用。
- `WFWorkflowInputContentItemClasses` 置空：这些指令不接收快捷指令输入，否则编辑器会出现无用的“快捷指令输入”。

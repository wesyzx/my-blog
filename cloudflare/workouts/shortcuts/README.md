# 运动快捷指令

这些文件把 Apple 健康的运动数据上传到博客的 `workouts.wesyzx.workers.dev`，替代原来的自建 iOS App。仓库内的公开版本不包含健康数据或上传令牌；个人自用版可预先配置令牌，运行时无需重复输入。

## 文件

- `actions-template.plist`：从该 iPhone 导出的 `Find Workout` 动作描述、属性标识和枚举元数据，不含实际健康值。
- `workoutgpx-template.plist`：从该 iPhone 导出的自动 GPX 导出动作描述，不含健康数据。
- `build.py`：默认生成三个日常指令到 `/private/tmp`；`--all` 额外生成排查用版本。
- `*.shortcut`：已签名的可导入文件，验收状态见下文；用 Mac“快捷指令 → 文件 → 导入”安装后经 iCloud 同步到 iPhone。

摘要类（读取热量、时长、心率，走 `/internal/healthkit`）：

| 指令 | 用途 |
| --- | --- |
| 同步最近运动到博客 | 日常主力：读取最近一条运动并上传 |
| 上传运动轨迹到博客 | 自动导出最近一次有 GPS 的运动并上传，无需选择文件 |
| 一键同步运动到博客 | 合并版：先传最近运动摘要，再尝试上传最近一次有 GPS 的运动轨迹 |

其余 4 个（`预览最近运动上传数据`、`预览运动上传数据`、`同步运动到博客`、`预览运动轨迹文件`）
是同一套逻辑的预览版与多选版，2026-10-15 按用户要求删除，只在需要排查时用生成器重建。
只有使用 `--all` 才会额外生成这 4 个版本，签名后可按需导入。

三个日常指令并存，互不依赖：合并版是给“只想按一次”的场景准备的，两个分步指令仍然保留。

合并版（`一键同步运动到博客`）内部顺序固定为：摘要请求 → WorkoutGPX 导出 → 轨迹请求。
摘要先发送；轨迹按导出的文件逐条发送，并分别显示服务端响应。
导出结果为空时跳过轨迹上传；WorkoutGPX 本身报错仍可能中断指令。
需确认响应包含 `ok: true`，不能仅凭指令运行结束判断成功。

轨迹类走 `/internal/route`。

轨迹类不需要输入 UUID 或开始时间：Worker 读取 GPX 内第一个 `<time>`，在已有运动里按最近时间匹配，容差 30 分钟以吸收 GPS 首次定位延迟。响应里的 `matchedBy` 会说明匹配方式（`id` / `startedAt` / `gpx-time`），`workoutStartedAt` 是最终匹配到的运动开始时间。健康 App 已测到的时长、热量优先，GPX 只补轨迹、距离和爬升。

## 心率来源

心率直接取 Actions `Find Workout` 自带的 `averageHeartRate` 属性，与热量、时长在同一次
`/internal/healthkit` 请求里上传为 `averageHeartRateBpm`。这条属性由 Actions 从 Apple 健康读取，
是这次运动的平均值，不需要按时间窗二次查询样本，也不使用全天数据。

不再上传最大心率：Actions 未暴露可用的 `maxHeartRate` 字段，常见写法在真机均返回空。
后端把空值或非正数视为未测量，不会覆盖已有值，页面也不会显示 `0 bpm`。

首次运行会在手机上弹出健康数据授权，需要允许读取“心率”和“体能训练”。授权位置：
健康 App → 右上角头像 → App → Actions → 打开对应读取开关。

## 从运动到路径图

只有带 GPS 的室外运动（跑步、骑行、健走等）才有轨迹；爬楼、力量训练等室内运动在
WorkoutGPX 里会被“无 GPS”过滤掉，不会出现在列表里。

顺序很重要：**先传摘要，再传轨迹**。轨迹接口是在已有运动上补一条路线，如果这次运动还没
进过博客，上传会返回 `No matching workout found`。

分步（两个指令都要跑，顺序不能反）：

1. 室外运动结束、手表同步到手机后，运行 **同步最近运动到博客**。
2. 运行 **上传运动轨迹到博客**，等待返回 `ok: true`。
3. 打开博客 `/workouts`，查看“最近路线”。

合并运行：只运行 **一键同步运动到博客**，它会依次尝试上面两步，不需要先跑别的指令。

个人版无需输入令牌，也无需手动导出或选择 GPX。更新后的首次运行可能需要允许
WorkoutGPX 动作和向博客上传文件；可选择“始终允许”。日常运行时手机需解锁；通过
iPhone 镜像操作时，手机本体保持锁屏、Mac 保持解锁。

爬楼等室内运动只运行第一个指令。第二个指令查找的是最近一次**有轨迹**的运动，
不会为室内运动生成路线。如果要上传较早的运动，应先同步对应的摘要。

合并版的第 2 步仍然查找“最近一次有轨迹的运动”，可能早于刚上传的摘要。
如果刚做完室内运动、上一次室外运动还没同步过摘要，轨迹接口可能返回
`No matching workout found`；此前成功上传的室内运动摘要仍会保留。

需要单独保存 GPX 时：WorkoutGPX → 选择运动 → 右上角分享 → 保存到“文件”。
这只是备份或给其他 App 使用，上传博客不再需要此步骤。

苹果健康全量导出是备用方式，脚本在 `scripts/import-apple-health.py`。

## 生成与签名

### 个人自用免输入版

运行 `python3 cloudflare/workouts/shortcuts/build.py --personal`，在终端隐藏输入上传令牌
（也可从 `INGEST_TOKEN` 环境变量读取）。三个个人版只写入
`/private/tmp/personal-workout-shortcuts/`，文件权限为仅当前用户可读写；签名输出也必须留在此目录。
签名导入时，已有同名指令选择“替换”。iCloud 会将个人版同步到同一账号的 iPhone。

令牌以文本保存在个人指令内，不能把该个人版分享给他人或放入公开仓库。
更新导入后可能需要重新确认一次 Actions 访问和博客上传授权。

### 公开版

```bash
python3 cloudflare/workouts/shortcuts/build.py
for name in "同步最近运动到博客" "上传运动轨迹到博客" "一键同步运动到博客"; do
  shortcuts sign --mode anyone \
    --input "/private/tmp/${name}-unsigned.shortcut" \
    --output "cloudflare/workouts/shortcuts/${name}.shortcut"
done
```

签名依赖 macOS 快捷指令服务。若 `shortcuts sign` 报“文件格式不正确”，通常是签名助手没有响应；先 `open -a Shortcuts` 让应用进入前台，再重试即可。

## 验收状态

当前状态（2026-10-15）：摘要免输令牌、自动导出 GPX 并上传、博客路线显示均已实机跑通。

2026-10-17：三个日常指令纳入正式文件，公开版运行时询问令牌。
合并版完成生成结构检查与签名；本轮未在 iPhone 上运行，分步指令的实测结果不代表合并版已通过真机验收。

已确认的事实：

- 单条与多选摘要上传已在真机跑通；重复上传同一 UUID 不新增记录。
- 2026-10-15 真机预览取到 10 月 14 日爬楼的 `averageHeartRate` 为 136.725883091268 bpm，`endedAt` 与时长吻合。
- 同日通过手机运行“同步最近运动到博客”，返回 `{"ok":true,"ingested":1,...}`；线上快照该条已写入
  `averageHeartRateBpm: 136.725883091268`，记录数仍为 11 条，既有心率与轨迹均保留。
- 已用记录本身的 `endDate` 替换失效的日期加法，仅用于预览诊断；上传只发送运动持续时间。
- 本机预览额外包含 `endedAt`、`rawAverageHeartRate`，不加入上传请求。

2026-10-15 已在 Mac 快捷指令（与 iPhone 同一 iCloud 库）清理：先删除 30 个调试残留
（排查心率时产生的诊断版与重复导入副本），再按用户要求删除 4 个低频预览/多选版，
最终只保留日常使用的 `同步最近运动到博客` 与 `上传运动轨迹到博客`。

当日 19:20 快走实测：摘要同步返回 `ok: true, ingested: 1`；自动导出上传返回
`ok: true, matchedBy: gpx-time, points: 1948`，匹配到同一 UUID。博客显示步行 3.04 km、
32 分钟、147 kcal、平均心率 127 bpm，并显示腾讯地图路线。重复上传更新同一次运动。

## 已知的序列化要点

- 日期动作的 `WFDate` 变量必须用 `WFTextTokenString`，用 `WFTextTokenAttachment` 会显示为空日期。
- 时长是测量值，需用 `WFCoercionVariableAggrandizement` / `WFNumberContentItem` 取无单位数字，不能把带“秒”的文本直接发给接口。
- 自动导出动作的实机标识为 `com.objectgraph.WorkoutGPX.ExportLatestWorkoutIntent`，
  `AppIntentIdentifier` 为 `ExportLatestWorkoutIntent`，团队为 `PHKS4YZMLE`。
  导出结果配合 `downloadurl` 的 `WFHTTPBodyType = File` 直接作为请求体。
- 此前失败的 `Adjust Date` 尝试同时写了 `WFAdjustOffsetPicker`（`WFTimeOffsetValue`）和 `WFDuration`（`WFQuantityFieldValue`），但 2026-10-15 真机仍显示“添加 0 秒”；该编码尚未验证成功，不能作为可复用的正确模板。
- 健康筛选器的日期区间用 `Operator = 1003`，`Values.Date` 是下界、`Values.AnotherDate` 是上界，两者都是变量引用。
- `WFWorkflowInputContentItemClasses` 置空：这些指令不接收快捷指令输入，否则编辑器会出现无用的“快捷指令输入”。

## 已放弃的路线：按时间窗查询心率样本

曾尝试用原生 `Find Health Samples`（类型“心率”，`Start Date` 落在运动起止区间内）+
`Calculate Statistics` 计算平均/最大心率，并为此做了多轮排查。结论是这个方向在本设备上不成立：

- 原时间窗、格式化时间窗、无日期且最多 1 条的心率查询在真机均返回 0 条；同一时段在健康 App
  里确实有逐条心率记录，健康读取权限也已确认开启。不能把空结果解释为原始数据缺失。
- 逐条按秒过滤版因运行超过 3 分钟被停止；覆盖日期再在快捷指令内筛选的版本也未取得可用结果。
- 反复核对后仍找不到可解释空结果的配置差异，因此改用 Actions 的 `averageHeartRate` 属性，
  一次即取到与健康 App 一致的数值。

排查过程中生成的大量诊断指令（`native-heart-check`、`心率批量预览`、`心率时段预览`、
`心率样本诊断`、`心率筛选对照`、`运动原始心率`、`运动心率字段`、`心率定位`、`日期格式参考`、
`运动字段诊断`、`运动读取诊断`、`heart-enddate`、`heart-fixed-preview` 等）均不再需要。
正式保留的是本目录签名发布的 3 个日常指令。

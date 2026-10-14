# Apple 运动数据迁移到快捷指令：研究与试验方案

研究日期：2026-10-14。用户设备：iOS 26.6.1（用户提供）。要求：免费，可以安装现成 App；运动摘要通过快捷指令上传，轨迹先尝试文件导出。

## 建议

已选定 **Actions + 快捷指令上传各类运动摘要，WorkoutGPX 导出有 GPS 的运动轨迹**。用户接受安装这两个免费 App，要求覆盖爬楼及其他运动。爬楼记录应先确认已作为一次训练存入健康库，验收时长、动态热量和心率；Actions 官方确认提供运动查询，但各类型的实际返回需实机确认。没有轨迹的运动仍正常同步摘要。页面对爬楼应优先展示时长、热量、心率，缺失距离/配速不应展示为有效测量值。

对于有 GPS 的室外运动，[WorkoutGPX 官方导出说明](https://objectgraph.com/blog/export-apple-watch-workouts-as-gpx/)确认轨迹包含坐标与时间戳，文件 description 包含运动自身的距离、时长、能量、爬升和平均心率。热量是动态热量还是总热量、实际文字格式、单位和稳定 ID 尚需真实文件确认，不能直接把 energy 填入 activeEnergyKcal。

轨迹接入需要增加博客的独立 GPX 导入适配；当前接口不能直接接收 GPX。没有 GPS 的室内运动不经过 GPX 导出流程。两者官方资料明确提供免费能力，符合减少自建 iOS App 维护的目标。以上结论是方案可行性判断，尚未在用户 iPhone 上完成端到端验证。

- [Actions 官方页面](https://sindresorhus.com/actions)列出免费的 `Find Workout` 动作，可以返回健康 App 中的运动、类型、时长、来源及热量、心率等指标。[App Store](https://apps.apple.com/us/app/actions/id1586435171) 的版本记录确认该动作从 4.0 加入，当前版本要求 iOS 26，符合用户提供的系统版本。距离、开始时间、稳定 ID、单位与可选字段的实际输出需实机确认。
- [WorkoutGPX 官方页面](https://objectgraph.com/workoutgpx/)明确免费、无内购，提供 `Export Latest Workout` 和 `Export Workouts` 两个快捷指令动作。可先手动导出一个有 GPS 的运动为 GPX，再尝试快捷指令导出。无 GPS 的室内运动无法生成轨迹。

## 安装后的首次验证

当前进展：通过 Mac 的 iPhone 镜像直接检查了用户的“读取运动数据”快捷指令。`Find Workout` 返回 Workout 对象列表，默认文字预览仅显示名称（例如 Stairs）。选取属性后，已经实测读取到 UUID、动态热量与运动持续时间。已有几条 UUID 与线上旧 App 上传的记录一致，最新运动尚未上传。近期没有可导出的 GPS 轨迹，轨迹验证暂待后续有路线的运动。后端的缺失字段覆盖问题已修复并部署；完整上传指令仍在实机调试。

已在 iOS 26.6.1 的变量面板确认：

| 实际属性 | 后端字段 | 当前验证情况 |
| --- | --- | --- |
| Identifier (`id`) | id | 已读取 UUID，已有运动与公开快照中的旧 App UUID 一致 |
| Workout Type (`workoutType`) | type | 属性及序列化键已确认，完整转换待验证 |
| 开始日期 (`startDate`) | startedAt、localDate | 属性及序列化键已确认，需分别格式化；日期动作输入必须使用实机导出的 WFTextTokenString 格式 |
| 结束日期 | 可用于核对记录 | 属性存在 |
| 持续时间 (`duration`) | durationSeconds | 已实测为测量值，预览单位为秒；上传须提取数值，不能把带“秒”的文本直接发给接口 |
| Elapsed Time | 暂不使用 | 属性存在，应与运动持续时间区分 |
| Active Calories (kcal) (`activeCalories`) | activeEnergyKcal | 已实测返回数值，单位为 kcal |
| Total Energy Burned | 暂不使用 | 属性存在，不能代替动态热量 |

原查询没有设置排序与条数限制，后续构造上传列表时应逐条循环，不能把多个运动的属性分别提取后拼接为一条记录。生成的完整指令虽已签名并安装，但实机执行目前出现系统错误，不能作为已通过的成品；正在使用最小读取诊断逐步定位。所有生成文件均不包含上传令牌或实际健康值，尚未上传真实数据。

操作提示：轻点“快速查看”里的蓝色运动变量打开属性面板，轻点面板顶端短横线可展开完整高度；编辑器左上角返回按钮可以退出变量面板。Mac“快捷指令”虽然同步了该指令，但未安装 Mac 版 Actions，会把查询显示为未知操作；本次实际测试在手机镜像中完成。

中国区 App Store 下载：[Actions](https://apps.apple.com/cn/app/actions/id1586435171)、[WorkoutGPX](https://apps.apple.com/cn/app/workoutgpx/id6743941036)。本次已核实两个中国区商店页面可访问。

1. 在 iPhone 安装后，各打开一次；运行健康读取动作时授予所需读取权限。
2. 在“快捷指令”中新建测试快捷指令，搜索 Actions 的 `Find Workout`，查询最近的运动并接“快速查看”。先确认爬楼训练的时长、动态热量、类型和 ID，再确认一条其他类型运动。动作不出现时按 Actions 官方说明重启设备。
3. 在 WorkoutGPX 选择一条在 Fitness 中有地图的运动，导出 GPX 并保存到“文件”。需要后续自动化时，再搜索 `Export Latest Workout` 或 `Export Workouts`。
4. 保持手机解锁进行测试。收集运动动作的实际输出与同一室外运动的 GPX 后，再实现准确的字段映射、记录关联和上传流程。

## 原生快捷指令与现成 App 的区别

| 项目 | 只用苹果原生快捷指令 | 快捷指令 + 免费现成 App |
| --- | --- | --- |
| 数据读取 | 使用苹果自带的健康动作，支持范围由苹果决定 | App 使用 HealthKit 读取，再把结果交给快捷指令 |
| 一次运动的完整摘要 | 官方指南未列出完整 Workout 查询动作，需要在 iOS 26.6.1 确认 | Actions 明确提供 Find Workout；具体字段仍需确认 |
| 上传到博客 | 能构造 JSON 并发送 HTTP 请求 | 同样能上传，App 主要补足读取能力 |
| 轨迹导出 | 没有找到官方文档确认的原生运动轨迹读取动作 | WorkoutGPX 可导出文件 |
| 额外成本 | 无额外 App 费用 | 以上两个候选官方声明免费，安装地区可用性待确认 |
| 日常操作 | 缺字段时可能需要手动输入或导出 | 首次安装并授权，之后主要运行快捷指令 |

苹果[查找与过滤动作指南](https://support.apple.com/en-mt/guide/shortcuts/apd3c845e881/ios)确认 `Find Health Samples` 存在，但不能据此认定它能列出完整运动记录。当天的步数、运动分钟或步行跑步距离，不应直接当作某一次跑步的摘要：可能包括日常活动，也可能包含多个来源。

App 方案仍然属于快捷指令工作流，只是读取健康数据的动作来自 App。应按实际所需数据授予健康读取权限；安装 App 本身不会让博客自动取得健康库。

## 已研究但不作为免费首选的方案

| 工具 | 核实结果 |
| --- | --- |
| Health Auto Export | [官方 FAQ](https://help.healthyapps.dev/en/health-auto-export/faq/)列出的免费层主要为统计与小组件，GPX 导出在 Basic，自动化属于 Premium；不符合本次免费目标 |
| Toolbox Pro | [官方](https://toolboxpro.app/health)确认 Get Workouts，但本次未从官方资料确认该动作免费；不能把免费下载当作免费可用 |
| Health Exporter & Shortcuts 等 | 提供相关功能，但未确认本次所需能力永久免费；不作为首选 |

Health Auto Export 的 [JSON 根结构](https://help.healthyapps.dev/en/health-auto-export/export-format/)是 `data.workouts`，其[运动格式](https://help.healthyapps.dev/en/health-auto-export/export-format/workouts/)使用 `start`、`name` 和带单位的数量对象。即使以后改用它，也不能直接发到当前只接收 `activities` 的接口，必须做转换。

## 博客现状：可复用的部分

数据流：

```text
目前：WorkoutSync → /internal/healthkit → D1 → R2 快照 → /workouts
建议：Actions → 快捷指令 → /internal/healthkit → 同一数据流
轨迹：WorkoutGPX → GPX 文件 → 匹配已有运动 → polyline → 路线展示
```

- `cloudflare/workouts/src/index.js` 已有 `POST /internal/healthkit`，需要 `Authorization: Bearer <INGEST_TOKEN>`。
- 当前接口接收单个标准化运动、数组或 `activities` 容器，不直接接收 Apple Health 原始 XML、任意第三方 JSON 或 GPX 文件。单请求最多 500 条、2 MB。
- `lib/workouts.ts` 与 `components/WorkoutLiveContent.tsx` 已支持距离、时长、配速、热量、平均心率和编码路线。页面展示基本可沿用。
- 上传成功会立即重建快照，不必等 Cron；公开读取有缓存，验收时需考虑缓存时间。
- `scripts/import-apple-health.py` 已能读取 Apple 健康 ZIP 中的 `export.xml` 和 `workout-routes/*.gpx`，转换为 polyline。它目前不能单独把一个 GPX 补到指定活动。

## 摘要快捷指令的试验步骤

1. 安装 Actions，打开一次并授予所需健康读取权限。
2. 新建“预览运动数据”快捷指令，添加 Actions 的 `Find Workout`；先限制为最近一条记录。
3. 用“快速查看”检查输出属性：开始时间、类型、距离及单位、运动时长及单位、热量、心率、稳定 ID。对照 Fitness 的同一运动，验证数值。
4. 确认输出后，循环构造当前后端所需字典，并装入 `activities` 列表。使用原生“获取 URL 内容”，POST JSON 到 `/internal/healthkit`。令牌在本机配置，分享快捷指令时移除。
5. 首次只同步一条；成功响应必须包含 `ok: true`、`ingested` 和 `lastUpdated`。重复上传后确认数量不增长。
6. 稳定后采用最近 7 天重复同步，补偿 Apple Watch 向 iPhone 同步的延迟；空结果直接结束，失败不推进同步标记。

下面是博客的目标 JSON，**不是 Actions 的原始返回格式**，数值仅为示例：

```json
{
  "source": "apple-health",
  "activities": [{
    "id": "stable-workout-id",
    "type": "Run",
    "startedAt": "2026-10-14T06:30:00+08:00",
    "localDate": "2026-10-14",
    "distanceMeters": 5000,
    "durationSeconds": 1800,
    "activeEnergyKcal": 350,
    "averageHeartRateBpm": 150
  }]
}
```

距离转换成米、时长转换成秒、动态热量转换成 kcal。优先使用运动记录自身的时长，不能直接用结束时间减开始时间替代（暂停时间可能不同）。`localDate` 应从原记录的当地日期得到，不能从转换后的 UTC 时间截取；后端现在会以原始 ISO 时间的日期作为新增记录的默认日期。缺失指标不要伪造为已测量的 0。

ID 优先沿用真实 HealthKit UUID，并确认字符串大小写格式与旧 App 一致；若 Actions 不提供同一 UUID，应先设计映射，不要每次生成随机 UUID。

苹果[自动化触发器文档](https://support.apple.com/en-ie/guide/shortcuts/apd932ff833f/ios)支持 Apple Watch 运动结束触发。建议先在 iPhone 解锁时手动同步，之后再验证结束触发和每日补同步。触发成功不代表健康数据已经完成同步。[WorkoutGPX 文档](https://objectgraph.com/workoutgpx/)明确读取健康数据时需要解锁；应设计解锁后可重试的流程。

## 轨迹导出试验

先选一条在 Fitness 中确实有地图的室外运动：

1. 用 WorkoutGPX 手动导出 GPX，保存到“文件”或 AirDrop 到 Mac。随后可用其 `Export Latest Workout` 动作重复这个过程。
2. 检查 GPX 是否有坐标、时间戳、海拔，是否保留可对应运动的 ID/元信息；不能仅凭文件名认定与摘要 ID 相同。
3. 补轨迹应指定已上传活动的 ID，不另建一条运动。无 ID 时结合运动开始/结束、类型及轨迹时段匹配，候选不唯一就交由用户选择。
4. 用现有 polyline 编码逻辑转换，验收地图。只有明确选择发布时才写入公开路线。

苹果健康全量导出是免费的备用方式：[苹果官方说明](https://www.apple.com/uk/legal/privacy/data/en/health-app/)提供“健康 → 头像 → 导出所有健康数据”的入口。得到 ZIP 后，可先运行已有脚本：

```bash
python3 scripts/import-apple-health.py ~/Downloads/apple-health-export.zip --dry-run
```

现有脚本只在本机解析 ZIP，上传标准化运动数据。但正式使用前需修复以下问题，尤其不能直接混用旧 App 上传、摘要上传和历史导入。

## 实施前需要解决的问题

| 问题 | 当前代码证据 | 建议处理 |
| --- | --- | --- |
| 重复记录 | 旧 App 用 `workout.uuid.uuidString`；XML 缺 uuid/id 时，脚本用类型与起止日期的 SHA-1 指纹；Worker 仅按 `source:id` 去重 | 统一 UUID 表达，或维护旧 ID 与导出 ID 的映射；匹配冲突时不要自动合并 |
| 补轨迹后被摘要清空 | 原 UPSERT 全量覆盖 `route_polyline` | 已修复并部署：省略轨迹保留已有值，明确 `publishRoute: false` 才撤下路线 |
| 心率、爬升被覆盖 | 原 UPSERT 将缺省心率写 NULL、爬升写 0 | 已修复并部署：缺省指标保留，显式数值 0 正常更新 |
| XML 子节点指标漏读 | `parse_workouts` 只读 Workout 顶层距离/爬升属性，没有解析 WorkoutStatistics | 增加子节点指标与单位支持，再用真实导出文件确认格式 |
| 轨迹误配 | 当前容差默认 90 分钟；无时间戳 GPX 会按日期参与匹配 | 优先用导出文件内的明确关联，歧义拒绝自动匹配；支持人工指定目标活动 |
| 单独 GPX 尚无入口 | 当前脚本要求 ZIP 中存在 export.xml；Worker 要求标准化活动 JSON | 添加 GPX 补轨迹流程，复用编码逻辑，并保留原摘要 |

## 本次本地验证与边界

使用内存中的合成 Apple Health ZIP（两条运动、一条 GPX），验证已有导入器能读取传统顶层距离，转换公里/分钟为米/秒，保留北京时间当地日期，编码轨迹并计算样例爬升。另一条仅使用 WorkoutStatistics 子节点的样例，复现距离被读为 0、热量未导入。

使用项目现有数据库迁移和原始 UPSERT SQL，在内存 SQLite 中先写入带路线、心率和爬升的记录，再重传缺少这些字段的摘要，复现路线与心率被清空、爬升被写为 0。

本次已修改 Worker 的部分更新、单对象导入和指标校验，新增真实 SQLite 存储测试；19 项 Worker 测试、语法检查和博客类型/静态检查通过。2026-10-14 已通过 Cloudflare 控制台部署，活动版本为 `eecec194`，线上健康检查通过，现有公开快照仍保持原数据。博客页面已在本地调整为无距离时隐藏距离/配速，移动端保留时长，但该前端修改尚未部署。

快捷指令生成源码与实机导出的无敏感数据属性模板保存在 `shortcuts/`。签名安装成功与实机运行成功是两项独立验收：目前完整预览尚未通过，不能报告上传完成。后续仍需验证完整字段预览、用户在手机输入令牌后的写入与重复同步，以及真实 GPX 的关联和路线展示。

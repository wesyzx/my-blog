# 运动数据 Worker

这个 Worker 为博客的 `/workouts` 页面提供一个稳定、公开、只读的 JSON 快照。

日常使用 iPhone 快捷指令上传 Apple 健康的运动摘要，由 WorkoutGPX 导出室外运动轨迹。三个正式指令、安装与使用说明见 [运动快捷指令](./shortcuts/README.md)。原自建 iOS App 工程已退出维护并从当前目录移除，旧代码可从 Git 历史恢复；试验过程保留在 [研究记录](./SHORTCUTS_RESEARCH.md)。

## 数据流

```text
iPhone 快捷指令（Apple 健康摘要 + WorkoutGPX 轨迹）
  -> Worker 写入接口
  -> D1（标准化活动 + 同步游标）
  -> R2（v1/workouts.json + v1/routes.json）
  -> GET /v1/workouts.json
  -> 博客 WORKOUTS_API_URL
```

Cron 每 6 小时运行一次（`17 */6 * * *`，北京时间 02:17、08:17、14:17、20:17），作为快照重建与可选来源同步的后备机制。未配置 `SOURCE_URL` 时，Cron 仅从 D1 重建 R2 快照，不会自动从 Apple 健康获取运动数据。

## API

- `GET /v1/workouts.json`：公开汇总快照，与 `lib/workouts.ts` 的 `WorkoutsDataContract` 一致。为控制首屏体积，活动列表默认保留最近 50 条。
- `GET /v1/routes.json`：公开路线快照，包含所有明确标记 `publishRoute: true` 的活动，供页面筛选最近一次徒步路线；不再展示全部轨迹地图和筛选列表。
- `GET /health`：快照健康状态，不返回运动详情。
- `POST /internal/ingest`：导入标准化活动，需要 `Authorization: Bearer <INGEST_TOKEN>`。
- `POST /internal/healthkit`：供 iPhone 快捷指令导入 Apple Health Workout，格式同上但默认来源为 `apple-health`，需要同一令牌。
- `POST /internal/route`：为已存在的运动补一条轨迹，接受 GPX 原始文本或 `{"gpx": "...", "id": "..."}`，需要同一令牌。定位目标运动有三种方式：`?id=<workout UUID>` 最精确；`?startedAt=<ISO 时间>` 允许前后 300 秒偏差；两者都不给时，Worker 读取 GPX 内第一个 `<time>` 时间戳自动匹配，容差放宽到 30 分钟以吸收 GPS 首次定位延迟。候选不唯一时按时间最近的一条匹配。响应会回传 `matchedBy`（`id` / `startedAt` / `gpx-time`）便于核对。
- `POST /internal/sync`：立即从 `SOURCE_URL` 同步，需要同一令牌。

单次导入最多 500 条、2 MB。路线默认不会公开，只有活动明确包含 `"publishRoute": true` 时才写入路线快照。单条编码路线超过 100 KB 会被拒绝，避免误把异常数据写入公开存储。

接口也接收单个运动对象，方便快捷指令逐条 POST。更新已有 ID 时，只修改请求实际提供的字段：省略距离、时长、爬升、心率或路线会保留已有值；明确提供数值 `0` 会更新为 0；`publishRoute: false` 会撤下既有路线。时长、距离、热量必须是没有单位的非负数值，支持数字字符串，拒绝“2298 秒”等带单位文本。

## 运动分类

前端、Worker 共用 `lib/workout-types.mjs`，接受 Actions 的英文名称、Apple Health 的
`HKWorkoutActivityType...` 和中文名称。快捷指令继续发送原始 `workoutType`，不需要重新安装。

| iPhone 运动 | 页面显示 |
| --- | --- |
| 整理放松、柔韧性 | 拉伸 |
| 户外步行 / 徒步，不足 5 km | 步行 |
| 户外步行 / 徒步，达到 5 km | 徒步 |
| 爬楼梯 | 爬楼 |
| 跳绳 | 跳绳 |
| 户外跑步 | 跑步 |
| 户外单车 | 骑行 |
| 高强度间歇训练、功能性力量训练、核心训练 | 训练 |

5 km 门槛只用于步行和徒步，跑步、骑行等仍保持原分类。“最近路线”从完整路线快照中
选取最新一条达到 5 km 的徒步路线，不受最近 50 条运动的限制；没有匹配时显示空状态。
其他运动路线仍保存在数据库中，页面不展示它们。

`0003_activity_categories.sql` 将历史步行 / 徒步按距离重新分类，并增加 `source_type`
保留原始运动类型。更新分类不会修改 UUID、时间、距离、热量、心率和路线。
早期已经归并为 `Workout` 且未保存原始类型的记录无法自动还原为拉伸或跳绳，需要按
原 UUID 从 Apple 健康重新上传，或在健身 App 核对后定向修复。历史 ZIP 导入器也保留
原始类型，由 Worker 统一分类。

2026-10-23 历史修复：已备份线上 13 条记录，迁移后逐项核对 UUID、时间、距离、
时长、爬升、热量、心率和路线均未改变。2025-01-04 的 10.03 km 步行归为徒步；
2026-10-22 06:42 的记录已在 iPhone 健身 App 核实为整理放松，定向修正为拉伸。
2026-03-23 10:09、2026-03-24 16:33 两条记录已按用户最新指定改为步行；
`0005_historical_walk.sql` 覆盖此前 `0004_historical_stretch.sql` 的拉伸分类，
按 UUID 和时间定向更新，保留其他运动指标，并将 `source_type` 保存为 `Walking`，
供后续快照重建使用。

2026-10-14 已将部分更新、单对象接口与 GPX 补轨迹接口部署到 Worker，当前版本 `e775ccfe`。本地 29 项测试及语法检查通过，线上 `/health` 返回 `ok: true`。同时修掉了空指标发布 `null` 导致页面显示“0 bpm”的问题：快照已重建，缺失的距离、配速、心率现在不再输出。

轨迹接口的行为：已有运动的 Apple Health 距离与爬升优先，GPX 只补真正缺失的值；补轨迹不会新建一条运动，也不会覆盖已有的摘要指标。轨迹默认写入 D1，但只有活动标记 `publishRoute: true` 才进入公开路线快照。

快捷指令发送的最小 JSON：

```json
{
  "activities": [{
    "id": "healthkit-sample-uuid",
    "type": "Run",
    "startedAt": "2026-09-17T06:30:00+08:00",
    "distanceMeters": 5000,
    "durationSeconds": 1680,
    "elevationGainMeters": 32
  }]
}
```

写入接口还支持 `activeEnergyKcal`、`averageHeartRateBpm`、`maxHeartRateBpm` 和 `averageCadenceRpm`；Worker 会将这些指标保存在 D1 并返回给博客。当前快捷指令提供的指标与限制见快捷指令说明。

## 年度热量与爬升

年度快照增加 `totalActiveEnergyKcal`（动态热量合计，kcal）与
`activeEnergyActivityCount`（有热量数据的运动次数）。汇总按每条记录的 `localDate`
归年，在截取最近 50 条活动前计算，包含该年所有已存储记录。缺失热量不视为测量到
0 kcal；明确上传的 0 kcal 仍计为有数据。页面对不完整的热量汇总显示覆盖次数。
升级前的快照没有这两个字段，页面显示“—”，不会从最近 50 条记录拼出不完整的年度总数。
前端与 Worker 都需要更新；Worker 部署后须重建快照（下一次上传或 Cron 均会触发）。

单次记录现在显示已上传的 `elevationGainMeters`，并计入年度“已记录爬升”。
爬楼的高度缺失时显示“—”并说明未计入累计值。现有数据库以 0 保存默认爬升，
无法仅凭这个值区分“未同步”与“实测零爬升”，因此不把它描述为测量结果。
接口也接受独立的 `flightsClimbed`（爬楼层数）与 `stepsClimbed`（级数），
页面分别显示“层”和“级”。它们不会换算成米或加入累计爬升，避免把楼层高度
假设成真实测量值。`0006_flights_climbed.sql` 为这两项增加 D1 列。

当前摘要快捷指令会上传时长、动态热量、平均心率，并按本次运动的时间窗查询
“已爬楼层”样本上传 `flightsClimbed`。Actions 模板本身没有爬升或层数属性，
楼层数来自苹果原生健康查询，不来自 Actions 属性面板。该查询取运动时段内的样本总和，
仍需在 iPhone 上确认实际训练能返回样本及读取授权；签名完成不等于真机验收通过。
快捷指令没有上传级数或 HealthKit 实测的累计爬升米数。
Apple 的 [累计爬升元数据](https://developer.apple.com/documentation/healthkit/hkmetadatakeyelevationascended)
与 [爬楼层数](https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/flightsclimbed)
是不同指标：前者是长度，后者是次数，不能直接把层数当米数。
这些字段的存在不代表每次爬楼训练都已保存它们；没有样本时楼层数仍显示“—”。

备用导入器 `scripts/import-apple-health.py` 支持从训练的
`MetadataEntry key="HKElevationAscended"` 读取带单位的爬升，以及从
`WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned"` 读取动态热量。
支持米、公里、英尺和厘米的高度换算，以及 kcal、cal、kJ、J 的能量换算；
无法识别单位或缺失的指标会省略，保留后端已有值。不会把 `totalEnergyBurned`
当作动态热量。获取真实爬楼高度仍需核对同次训练的健康记录或导出文件，
再通过已有运动 ID 补传；若只有层数，可另行接入层数指标，不能伪装成实测高度。

将请求发往 `https://workouts.wesyzx.workers.dev/internal/healthkit`，添加 `Authorization: Bearer <INGEST_TOKEN>` 和 `Content-Type: application/json`。服务端按活动 ID 幂等更新，重复运行不会产生重复记录。

## 首次部署

通过 Cloudflare MCP 或控制台管理部署，不需要在本地安装 Wrangler。`wrangler.jsonc` 保留为基础设施声明与人工复核依据，已记录真实 D1 ID。

当前资源：Worker `workouts`、D1 `workouts`、R2 `workouts-snapshots`。D1 绑定名为 `DB`，R2 绑定名为 `SNAPSHOTS`。旧的空桶 `guanyan-workouts-snapshots` 未参与当前服务，待确认后清理。

已部署公开快照、健康检查、Cron、基础运行变量和 HealthKit 写入接口。`INGEST_TOKEN` 已配置为 secret；尚未设置 `SOURCE_URL` 或来源授权，因此定时任务只会重建快照，公开数据会在首次上传运动记录后出现。`PUBLIC_ORIGIN` 保留实际博客域名 `https://guanyan.me`，它不是资源名称。

Cloudflare MCP 的连接令牌至少需要当前账户的 `D1 Write`、`Workers R2 Storage Write` 与 `Workers Scripts Write` 权限；只读连接可以发现资源，但无法完成首次部署。

部署成功后，将公开地址写入博客部署环境：

```text
WORKOUTS_API_URL=https://workouts.wesyzx.workers.dev/v1/workouts.json
```

## 本地验证

纯逻辑与请求级测试不依赖 Wrangler：

```bash
npm test
npm run check
```

导入示例：

```bash
curl -X POST "https://<worker-domain>/internal/ingest" \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "source": "manual",
    "activities": [{
      "id": "morning-run-2026-09-16",
      "type": "Run",
      "startedAt": "2026-09-16T06:30:00+08:00",
      "localDate": "2026-09-16",
      "distanceMeters": 5000,
      "durationSeconds": 1680,
      "elevationGainMeters": 32
    }]
  }'
```

历史 Apple Health 导入（包含路线）

在 iPhone 的“健康”中导出数据后，把 ZIP 保存在本机，然后先预览解析结果：

```bash
python3 scripts/import-apple-health.py ~/Downloads/apple-health-export.zip --dry-run
```

确认数量后再上传。令牌只从本机环境变量读取，不要写入仓库：

```bash
export WORKOUTS_INGEST_URL=https://<worker-domain>/internal/healthkit
export INGEST_TOKEN='在 Cloudflare 中创建的 Secret'
python3 scripts/import-apple-health.py ~/Downloads/apple-health-export.zip
```

脚本会从 `export.xml` 读取活动，从 `workout-routes/*.gpx` 按时间和日期匹配路线，并将路线编码为前端使用的 polyline。重复导入是幂等的；未匹配到路线的活动仍会正常导入。

## 接入真实来源

来源适配器应返回：

```json
{
  "cursor": "optional-next-cursor",
  "activities": [
    {
      "id": "provider-activity-id",
      "type": "Run",
      "startedAt": "2026-09-16T06:30:00+08:00",
      "localDate": "2026-09-16",
      "distanceMeters": 5000,
      "durationSeconds": 1680,
      "elevationGainMeters": 32
    }
  ]
}
```

配置 `SOURCE_URL` 后，Worker 会携带上次的 `cursor` 查询参数做增量同步。私有来源可通过 `SOURCE_BEARER_TOKEN` secret 认证。COROS、Strava 或其他平台的授权和字段转换应放在来源适配器中，不暴露给公开读取接口。

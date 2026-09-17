# 运动数据 Worker

这个 Worker 为博客的 `/workouts` 页面提供一个稳定、公开、只读的 JSON 快照。

## 数据流

```text
运动平台或适配器
  -> Cron / 手动同步
  -> D1（标准化活动 + 同步游标）
  -> R2（v1/workouts.json + v1/routes.json）
  -> GET /v1/workouts.json
  -> 博客 WORKOUTS_API_URL
```

Cron 每 6 小时运行一次（`17 */6 * * *`，北京时间 02:17、08:17、14:17、20:17）。未配置 `SOURCE_URL` 时，Cron 仅从 D1 重建 R2 快照，不会自动获取运动平台数据。

## API

- `GET /v1/workouts.json`：公开汇总快照，与 `lib/workouts.ts` 的 `WorkoutsDataContract` 一致。为控制首屏体积，活动列表默认保留最近 50 条。
- `GET /v1/routes.json`：公开路线快照，包含所有明确标记 `publishRoute: true` 的活动，供路线墙和详情页按需加载。
- `GET /health`：快照健康状态，不返回运动详情。
- `POST /internal/ingest`：导入标准化活动，需要 `Authorization: Bearer <INGEST_TOKEN>`。
- `POST /internal/healthkit`：供 iPhone 快捷指令导入 Apple Health Workout，格式同上但默认来源为 `apple-health`，需要同一令牌。
- `POST /internal/sync`：立即从 `SOURCE_URL` 同步，需要同一令牌。

单次导入最多 500 条、2 MB。路线默认不会公开，只有活动明确包含 `"publishRoute": true` 时才写入路线快照。单条编码路线超过 100 KB 会被拒绝，避免误把异常数据写入公开存储。

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

HealthKit App 还可以附带 `activeEnergyKcal`、`averageHeartRateBpm`、`maxHeartRateBpm` 和 `averageCadenceRpm`；Worker 会将这些指标保存在 D1 并返回给博客。

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

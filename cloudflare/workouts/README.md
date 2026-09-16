# 运动数据 Worker

这个 Worker 为博客的 `/workouts` 页面提供一个稳定、公开、只读的 JSON 快照。

## 数据流

```text
运动平台或适配器
  -> Cron / 手动同步
  -> D1（标准化活动 + 同步游标）
  -> R2（v1/workouts.json）
  -> GET /v1/workouts.json
  -> 博客 WORKOUTS_API_URL
```

Cron 每 6 小时运行一次。未配置 `SOURCE_URL` 时，Cron 仍会从 D1 重建 R2 快照；可以先通过受保护的导入接口写入测试数据。

## API

- `GET /v1/workouts.json`：公开快照，与 `lib/workouts.ts` 的 `WorkoutsDataContract` 一致。
- `GET /health`：快照健康状态，不返回运动详情。
- `POST /internal/ingest`：导入标准化活动，需要 `Authorization: Bearer <INGEST_TOKEN>`。
- `POST /internal/sync`：立即从 `SOURCE_URL` 同步，需要同一令牌。

单次导入最多 500 条、2 MB。路线默认不会公开，只有活动明确包含 `"publishRoute": true` 时才写入快照。

## 首次部署

默认通过已连接的 Cloudflare MCP 创建 Worker、D1、R2、Cron 和 secrets。`wrangler.jsonc` 保留为基础设施声明与人工复核依据，其中的全零 `database_id` 需要在创建 D1 后替换为真实资源 ID。

Cloudflare MCP 的连接令牌至少需要当前账户的 `D1 Write`、`Workers R2 Storage Write` 与 `Workers Scripts Write` 权限；只读连接可以发现资源，但无法完成首次部署。

部署成功后，将公开地址写入博客部署环境：

```text
WORKOUTS_API_URL=https://<worker-domain>/v1/workouts.json
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

# 轨道之外

个人博客，生产分支为 `main`。

## 项目结构

- `app/`、`components/`、`lib/`：Next.js 主站，部署于 EdgeOne。
- `scripts/bundle-data.mjs`：生成 Notion 与 Memos 内容快照；`content/about.md` 管理关于页。
- `cloudflare/workouts/`：运动数据 Worker、D1 迁移与测试，是运动页面的数据服务。
- `cloudflare/workouts/shortcuts/`：三个正式运动快捷指令及生成器，日常使用见该目录的 README。
- `scripts/import-apple-health.py`：Apple 健康历史数据批量导入工具。
- `docs/`：灯箱说明与保留的主题设计提案。

主站和 Worker 分别部署。旧的 `ios/WorkoutSync` 工程已由快捷指令替代，代码保留在 Git 历史中。

## 本地开发

```bash
npm ci
# 按 .env.example 配置 .env.local
npm run dev
```

开发与构建前会同步内容；内容源暂时不可用时沿用已提交的快照。短记页面在请求时读取 Memos，仅在请求失败时回退到快照。

短记中文地址需要服务端的 `TMAP_SERVER_KEY`，地图底图使用浏览器端的 `NEXT_PUBLIC_TMAP_KEY`。
这两个变量需分别在本地和部署环境配置；修改部署环境后重新部署，修改本地配置后重启服务。
服务端 Key 应单独启用 WebService API，不配置浏览器域名白名单；浏览器 Key 仍保留域名限制。
腾讯返回 `110` 表示域名授权失败，能看到地图不代表服务端地址解析已获授权。
实时短记和回退快照均会补解析中文地址；失败请求退避 30 秒后可重试。

## 验证

```bash
npm run check
npm test
npm run check --prefix cloudflare/workouts
npm test --prefix cloudflare/workouts
npm run build
```

仅验证现有内容快照的生产构建时，使用 `npm run build --ignore-scripts` 跳过内容同步。

运动服务部署、接口与导入说明见 `cloudflare/workouts/README.md`；图片放大交互见 `docs/lightbox.md`。

# WorkoutSync

个人使用的 iPhone HealthKit 同步工具。它读取 iPhone 健康 App 中由 Apple Watch 写入的运动摘要、心率和路线，并上传到博客的 Cloudflare Worker。

## 第一次运行

1. 用 Xcode 打开 `WorkoutSync.xcodeproj`。
2. 在 Target → Signing & Capabilities 中选择自己的 Apple Account（Team）。
3. 将 iPhone 连接到 Mac，并在手机上信任此电脑、开启开发者模式。
4. 运行 App，点击“授权 Apple 健康数据”，在系统权限页允许运动、心率和路线读取。
5. 在 App 中填入 Worker 的 `INGEST_TOKEN`，点击“同步最近 25 条运动”。

默认上传地址为：

`https://workouts.wesyzx.workers.dev/internal/healthkit`

令牌只用于个人 Worker 的写入认证，不要提交到 Git 或截图中。

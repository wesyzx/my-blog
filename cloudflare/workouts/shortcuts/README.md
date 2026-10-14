# 运动快捷指令实验文件

**尚未完成实机验收。** 当前完整预览在 iPhone 上报系统错误，不能当作可用上传成品。未向线上接口发送真实健康数据。

`actions-template.plist` 保存从该 iPhone 导出的 Find Workout 描述、属性标识和枚举元数据；没有运动实际值或上传令牌。已实机读到 UUID、秒单位时长和 kcal 动态热量，UUID 与旧 App 上传的既有记录一致。

`build.py` 生成只读第一条运动的兼容性试验版：逐字段取第一项、格式化开始时间与当地日期、构造标准 JSON。时长与热量以无单位数字字符串发送，Worker 会校验并转为数字。它不读取 GPS，也不自动补历史；必须先验证预览中的所有字段确实对应同一条记录。

```bash
python3 cloudflare/workouts/shortcuts/build.py
shortcuts sign --mode anyone \
  --input /private/tmp/预览最近运动上传数据-unsigned.shortcut \
  --output cloudflare/workouts/shortcuts/预览最近运动上传数据.shortcut
shortcuts sign --mode anyone \
  --input /private/tmp/同步最近运动到博客-unsigned.shortcut \
  --output cloudflare/workouts/shortcuts/同步最近运动到博客.shortcut
```

签名需要 macOS 的快捷指令服务与 iCloud；受限终端环境中可能返回格式错误，应先确认签名服务可访问。使用 Mac“快捷指令 → 文件 → 导入”安装签名文件，然后由 iCloud 同步到 iPhone。

上传动作只在运行时询问已有 `INGEST_TOKEN`，不会把令牌保存进文件。返回内容必须明确包含 `ok: true` 和 `ingested`，不能仅凭流程结束判断成功。首次上传后需核对公开快照；重复上传相同 UUID 应保持数量不增长。

现场排查记录：

- 使用原始 Find Workout + Quick Look 的最小重签名指令已在手机运行正常，显示秒单位的运动时长，证明基本读取与签名安装流程可用。
- 日期动作 `WFDate` 的变量值在本机原生导出中采用 `WFTextTokenString`，直接使用 `WFTextTokenAttachment` 会显示为空日期占位符；生成器已按原生格式修正。
- 完整读取、字段列表提取、测量值转数值和字典拼装仍需逐步定位和验证。批量版本暂不作为成品分发。

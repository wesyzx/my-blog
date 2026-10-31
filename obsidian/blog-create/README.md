# Blog Create

Obsidian 是博客相册、照片和视频的主要管理入口。左侧保留四个独立按钮：
新建博文、新建美食、新建相册、管理相册与视频。

## 使用

1. iPhone 快捷指令照常上传并发布照片或视频。
2. Obsidian 打开后每分钟读取一次新增相册，也可以点击管理界面的“刷新”。
3. 新相册导入 `Blog/gallery/`，每个相册一篇可编辑笔记。
4. 在“管理照片和视频”中预览、播放或移除媒体，也可直接编辑笔记。
5. LiveSync 上传完成后，阿里云等待内容稳定 90 秒，再自动推送 GitHub、
   触发 EdgeOne 构建。发布完成后博客显示最新内容。

删除照片：删除正文中的 `![照片 …](<地址>)` 整行。
删除视频：删除正文中的 `<video …></video>` 整行。
改变顺序：移动媒体引用行。`mediaMetadata` 只保存尺寸、时长和可选封面，
删除正文引用后不会根据这些旧元数据重新加入媒体。

`published: false` 可下线相册；删除整篇相册笔记或移除最后一个媒体也会下线。
管理界面“下线”会将笔记移入 Obsidian 回收站。恢复原笔记且
`published: true` 后可以重新发布。上述操作保留 R2 原文件；
这属于从博客移除，并非永久销毁文件。

视频保留 `kind`、宽高、时长、MIME 类型和可选 `poster`。
正文使用 HTML video，Obsidian 阅读模式和管理界面可以播放；
博客沿用现有稳定画框和首帧预览播放器。
本地视频附件放在 `Blog/attachments/` 并引用，服务端单附件上限 50 MiB；
更大视频仍使用 iPhone 快捷指令先上传 R2。

## 同步方向与删除保护

R2 只负责首次导入新相册；已导入相册的内容、日期、发布状态和删除决定
以 Obsidian 为准。刷新不会覆盖笔记，不会重新创建已删除的相册。
`Blog/gallery/相册同步记录.md` 保存已接管相册 ID，随 LiveSync、
GitHub 一起保存，但不会作为页面发布。**保留此记录**；
丢失记录或丢失历史 ID 时发布流程停止，防止旧线上内容复活。

插件会将旧 `Blog/gallery/线上相册/` 中相应的自动生成副本移入回收站，
后续只编辑 `Blog/gallery/` 下的正式笔记。
已接管相册不要再通过旧 R2 管理接口修改或永久删除原文件；
否则 Obsidian 笔记仍可能引用已丢失的资源。
未接管的新手机相册仍可以先上线，随后导入 Obsidian，不影响快捷指令使用。

上传令牌只需输入一次，存放在本机插件 `data.json`；
更新插件保留该文件。令牌和本机配置不进入博客源代码仓库。

## 安装

复制 `main.js`、`gallery-model.js`、`manifest.json` 和 `styles.css` 到
`<Vault>/.obsidian/plugins/blog-create/`，然后重新加载此插件。
必须同时部署支持同步记录的阿里云 reader/publisher 与博客构建程序；
旧版本只支持单向只读副本。

管理界面读取 `https://img.215320.xyz/internal/gallery/albums`，
使用与 iPhone 快捷指令一致的 `GALLERY_UPLOAD_TOKEN`。
新版本的编辑/下线操作只写 Vault，由阿里云作为唯一的 Obsidian Git 自动写入者。

# 不赶 / The Unhurried — 博客设计规范
> 参考站点：veryjack.com | 用于 Claude Code 直接实施

---

## 一、设计哲学

| 关键词 | 说明 |
|--------|------|
| 克制温暖 | 米白底色，无刺眼高饱和色，低密度排版 |
| 中英双语气质 | 中文标题 + 英文副标题搭配，字体处理有层次 |
| 个人博客感 | 有作者存在感，非媒体感，非企业感 |
| 内容优先 | 封面图 + 分类 + 标题 + 日期，极少废料 |

---

## 二、色彩系统（CSS Variables）

```css
:root {
  /* 主色调 */
  --color-accent:        #E8523A;       /* 砖红/橘红，唯一强调色 */
  --color-accent-light:  #E8523A18;    /* 标签底色、hover 背景 */
  --color-accent-border: #E8523A40;    /* 轻描边 */

  /* 背景层级 */
  --color-bg-page:       #F5F4F0;      /* 页面整体背景，暖米色 */
  --color-bg-surface:    #FAFAF8;      /* hero、featured 区域背景 */
  --color-bg-card:       #FFFFFF;      /* 文章卡片、侧边栏 widget */
  --color-bg-nav:        rgba(255,255,255,0.92); /* 导航栏，毛玻璃 */

  /* 文字层级 */
  --color-text-primary:   #2C2B28;     /* 标题、正文 */
  --color-text-secondary: #5F5E5A;     /* 副标题、摘要 */
  --color-text-muted:     #888780;     /* 日期、评论数、标签 */
  --color-text-hint:      #B4B2A8;     /* placeholder、辅助信息 */

  /* 边框 */
  --color-border:         rgba(0,0,0,0.08);   /* 默认描边 */
  --color-border-hover:   rgba(0,0,0,0.15);   /* hover 描边 */

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    --color-bg-page:       #1C1B18;
    --color-bg-surface:    #242320;
    --color-bg-card:       #2A2925;
    --color-bg-nav:        rgba(28,27,24,0.92);
    --color-text-primary:  #F0EFE9;
    --color-text-secondary:#B4B2A8;
    --color-text-muted:    #888780;
    --color-border:        rgba(255,255,255,0.08);
    --color-border-hover:  rgba(255,255,255,0.15);
  }
}
```

---

## 三、字体系统

### 中文正文字体栈
```css
--font-body-zh: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
```

### 英文 / 拉丁字体
```css
--font-display-en: "Playfair Display", "Georgia", serif;   /* 副标题、slogan、斜体场合 */
--font-body-en:    "Lora", "Georgia", serif;                /* 英文正文段落 */
--font-ui:         -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; /* UI 元素 */
```

### 字体规格

| 用途 | 大小 | 字重 | 行高 | 字体 |
|------|------|------|------|------|
| 站名 / Logo | 18px | 500 | - | `--font-ui` |
| 文章大标题（hero） | 26–32px | 500 | 1.3 | `--font-body-zh` |
| 卡片标题 | 14–15px | 500 | 1.4 | `--font-body-zh` |
| 正文段落 | 16–17px | 400 | 1.8 | `--font-body-zh` |
| 英文副标题 / slogan | 13px | 400 | - | `--font-display-en`, italic |
| 导航链接 | 13px | 400 | - | `--font-ui` |
| 元信息（日期/标签） | 11–12px | 400 | - | `--font-ui` |
| 分类标签 | 11px | 500 | - | `--font-ui`, letter-spacing 0.06em |

---

## 四、间距系统

```css
/* 遵循 4px 基础单位 */
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-12: 48px;
--space-16: 64px;

/* 圆角 */
--radius-sm: 4px;    /* 标签 pill */
--radius-md: 8px;    /* 按钮、输入框 */
--radius-lg: 12px;   /* 卡片 */
--radius-xl: 16px;   /* 图片容器 */
```

---

## 五、页面结构与布局

### 5.1 整体布局

```
┌─────────────────────────────────────────┐
│  NavBar (sticky, 52px, 毛玻璃)           │
├─────────────────────────────────────────┤
│  Hero / Featured Post (全宽)             │
├──────────────────────┬──────────────────┤
│                      │                  │
│   文章列表 (主内容)    │  侧边栏 (240px)   │
│   2列卡片 / 单列列表   │                  │
│                      │                  │
├─────────────────────────────────────────┤
│  Footer                                 │
└─────────────────────────────────────────┘
```

**响应式断点：**
- `> 1024px`：主内容 + 侧边栏双列
- `768px–1024px`：主内容单列，侧边栏折叠到底部
- `< 768px`：全单列，导航折叠为 hamburger

**页面最大宽度：** `1100px`，居中，两侧 padding `24px`

---

### 5.2 导航栏 NavBar

```
[Logo点] 站名          博文  说说  相册  关于  [搜索]
```

- 高度：52px（移动端 48px）
- 背景：`backdrop-filter: blur(12px)` + `var(--color-bg-nav)`
- 底部：`border-bottom: 0.5px solid var(--color-border)`
- Logo：小圆点（砖红 `--color-accent`）+ 站名文字
- 下拉子菜单（"抽屉"类似）：鼠标悬停展开，有二级菜单
- 移动端：右侧汉堡菜单，展开全屏覆盖层
- 激活态导航项：`font-weight: 500`，`color: var(--color-text-primary)`

---

### 5.3 首页 Hero 区

- 展示最新一篇文章
- 封面图（16:9，圆角 `--radius-xl`）
- 分类标签 → 文章标题 → 元信息（日期 + 评论数）
- 背景：`var(--color-bg-surface)`，底部细线分隔

---

### 5.4 文章列表（卡片）

```css
/* 卡片样式 */
.post-card {
  background: var(--color-bg-card);
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.post-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

/* 封面图比例 */
.card-thumbnail {
  aspect-ratio: 16/9;
  object-fit: cover;
}

/* 卡片内容区 */
.card-body {
  padding: 14px 14px 16px;
}

/* 分类标签 */
.card-category {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--color-accent);
  text-transform: none;
  margin-bottom: 6px;
}

/* 标题 */
.card-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 元信息 */
.card-meta {
  font-size: 12px;
  color: var(--color-text-muted);
  display: flex;
  gap: 12px;
  align-items: center;
}
```

---

### 5.5 侧边栏

组件列表（从上到下）：
1. **作者卡片**：头像（圆形）+ 名称 + 一句话简介 + 社交图标行
2. **标签云**：pill 形状，`border-radius: 99px`
3. **最近评论**（可选）
4. **RSS 订阅**（可选）

侧边栏 widget 样式：
```css
.sidebar-widget {
  background: var(--color-bg-card);
  border: 0.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 12px;
}
```

---

### 5.6 文章详情页

```
┌─ 文章头部 ────────────────────────────────┐
│  分类 › 标题                              │
│  大标题（28–32px，font-weight 500）        │
│  元信息：日期 · 阅读时间 · 标签            │
│  封面图（全宽，16:9，radius-xl）           │
└───────────────────────────────────────────┘

正文区：max-width 680px，居中

┌─ 正文样式 ────────────────────────────────┐
│  p: 17px / line-height 1.85 / color secondary
│  h2: 22px / weight 500 / margin-top 2rem  │
│  h3: 18px / weight 500                    │
│  blockquote: 左边框 3px accent色 + 斜体    │
│  code: 等宽字体，背景 bg-surface，radius-sm│
│  img: 全宽，radius-md，带 caption         │
└───────────────────────────────────────────┘

底部：上一篇 / 下一篇 导航 + 评论区
```

---

### 5.7 页脚 Footer

```
[Everything happens for the best]  ← 链接，主色
© 2025 不赶 · CC BY-NC-ND 4.0
```

简洁单行，背景 `var(--color-bg-surface)`，顶部细线。

---

## 六、组件规格

### 分类标签（Category Tag）
```css
.tag-category {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: var(--color-accent);
  background: var(--color-accent-light);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
```

### 普通标签（Taxonomy Tag）
```css
.tag-pill {
  display: inline-block;
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-bg-surface);
  border: 0.5px solid var(--color-border);
  padding: 3px 10px;
  border-radius: 99px;
  transition: border-color 0.15s;
}
.tag-pill:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text-secondary);
}
```

### 社交图标行
```css
.social-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
.social-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 0.5px solid var(--color-border);
  color: var(--color-text-muted);
  transition: border-color 0.15s, color 0.15s;
}
.social-icon:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
```

---

## 七、动画与过渡

```css
/* 统一过渡参数 */
--transition-fast:   0.15s ease;
--transition-normal: 0.2s ease;
--transition-slow:   0.3s ease;

/* 卡片 hover */
.post-card { transition: box-shadow var(--transition-normal), border-color var(--transition-normal); }

/* 页面进入动画（可选，轻量） */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-up {
  animation: fadeUp 0.4s ease both;
}

/* 图片懒加载淡入 */
img.loaded {
  animation: fadeUp 0.3s ease both;
}
```

---

## 八、技术栈建议（供 Claude Code 参考）

| 选项 | 推荐程度 | 说明 |
|------|---------|------|
| Hugo + 自定义主题 | ★★★★★ | 静态生成，快，适合本方案 |
| Hexo | ★★★★ | JS 生态，主题丰富 |
| Astro | ★★★★ | 现代，支持 React/Vue 组件 |
| Next.js (App Router) | ★★★ | 如果需要动态功能（评论、说说） |

### 文件结构建议（Hugo）
```
layouts/
  _default/
    baseof.html      ← 整体骨架
    list.html        ← 文章列表
    single.html      ← 文章详情
  partials/
    nav.html
    post-card.html
    sidebar.html
    footer.html
assets/
  css/
    tokens.css       ← 本文件中的 CSS Variables
    base.css
    components.css
```

---

## 九、给 Claude Code 的指令模板

```
请参考以下设计规范，为我的博客「不赶 / The Unhurried」创建 [组件名称]：

设计原则：
- 暖米色背景（#F5F4F0），单一砖红强调色（#E8523A）
- 字体：中文 PingFang SC，英文斜体衬线 Playfair Display
- 卡片：白底 + 0.5px 细边框 + 12px 圆角，hover 有轻微阴影
- 间距克制，内容优先，无过度装饰
- 支持 dark mode

需要创建的组件：[在此填写]

参考结构：[贴入上方对应章节]
```

---

*设计方案版本：v1.0 | 基于 veryjack.com 分析提炼 | 2026年5月*

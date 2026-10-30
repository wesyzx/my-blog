/**
 * Auto-generated content snapshot. Do not edit manually.
 */
export const bundleData = {
  "posts": [
    {
      "slug": "tuotuokule",
      "title": "妥妥哭了",
      "date": "2026-10-20",
      "category": "未分类",
      "tags": [],
      "excerpt": "",
      "cover": "https://images.guanyan.me/20260619230307188.webp",
      "published": true,
      "content": "ajkfjak fopj ofqej jgkjagjk akdsfjak fkajf -eo l\n a\n faf\n a lfja f\n a f\n af \n af\n  af\n   af\n   aglg \n   e\n   faf\n   a\n   f\n   ad\n   f\n    af\n    a\n     df\n     a\n     df\n     a \n     f\n     a\nfa\ndfadfa\nd\nf\n\nggh\nr\nh\nrretwytuuy\nyet u\ny"
    }
  ],
  "food": [
    {
      "slug": "fff",
      "title": "afafa",
      "date": "2026-10-21",
      "cover": "https://img.guanyan.me/%7Byear%7D/%7Bmonth%7D%7Bdate%7D/%7Bmd5%7D.%7BextName%7D/26-10-21-c4f93ad3d53045d581ac8fa19e531f81.webp",
      "excerpt": "",
      "published": true,
      "content": "",
      "location": "afafa",
      "address": "afafa",
      "lng": 0,
      "lat": 0,
      "tags": [],
      "images": [
        "https://img.guanyan.me/%7Byear%7D/%7Bmonth%7D%7Bdate%7D/%7Bmd5%7D.%7BextName%7D/26-10-21-c4f93ad3d53045d581ac8fa19e531f81.webp"
      ]
    }
  ],
  "gallery": [
    {
      "slug": "test",
      "title": "测试",
      "date": "2026-10-23",
      "cover": "https://img.guanyan.me/webp/blog/obsidian/2026/10/1792712517517-xmcizwr0.webp",
      "excerpt": "",
      "published": true,
      "content": "![image](https://img.guanyan.me/webp/blog/obsidian/2026/10/1792712517517-xmcizwr0.webp)![image](https://img.guanyan.me/webp/blog/obsidian/2026/10/1792713124120-6h98qdtm.webp)\n\n![image](https://img.guanyan.me/webp/blog/obsidian/2026/10/1792742650943-kpi4fbtx.webp)\n\n![image](https://img.guanyan.me/webp/blog/obsidian/2026/10/2026-10-23-f0a5d7db-b7c6-40e8-9dab-dd5127d67c42.webp)",
      "category": "日常",
      "images": [
        {
          "src": "https://img.guanyan.me/webp/blog/obsidian/2026/10/1792712517517-xmcizwr0.webp",
          "width": 3072,
          "height": 4096
        },
        {
          "src": "https://img.guanyan.me/webp/blog/obsidian/2026/10/1792713124120-6h98qdtm.webp",
          "width": 3024,
          "height": 4032
        },
        {
          "src": "https://img.guanyan.me/webp/blog/obsidian/2026/10/1792742650943-kpi4fbtx.webp",
          "width": 1550,
          "height": 2262
        },
        {
          "src": "https://img.guanyan.me/webp/blog/obsidian/2026/10/2026-10-23-f0a5d7db-b7c6-40e8-9dab-dd5127d67c42.webp",
          "width": 2690,
          "height": 1116
        }
      ]
    },
    {
      "slug": "tuotuodediyigekuaidi",
      "title": "妥妥的第一个快递",
      "date": "2026-10-21",
      "cover": "https://img.guanyan.me/%7Byear%7D/%7Bmonth%7D%7Bdate%7D/%7Bmd5%7D.%7BextName%7D/26-10-21-c4f93ad3d53045d581ac8fa19e531f81.webp",
      "excerpt": "",
      "published": true,
      "content": "",
      "category": "日常",
      "images": [
        {
          "src": "https://img.guanyan.me/%7Byear%7D/%7Bmonth%7D%7Bdate%7D/%7Bmd5%7D.%7BextName%7D/26-10-21-c4f93ad3d53045d581ac8fa19e531f81.webp",
          "width": 1200,
          "height": 800
        }
      ]
    }
  ],
  "about": "你好，欢迎来到 **轨道之外**，我是 **Can Chou**，一个还在找旅途的人，我会把轨道之外的日子，一一收好。\n\n## 关于这里\n\n「轨道之外」是一份长期的个人记录。日常的、零碎的、不值得郑重其事写下来的东西，都放在这里：一顿好吃的饭、一段走远的路、一个折腾了很久才跑通的想法。\n\n它不是一个有明确主题的站点，更像一个可以随时回来翻看的地方。写下来，是为了不让它们太快被忘掉。\n\n## 这个站点\n\n站点本身也是我技术折腾的一部分，整条链路尽量保持简单、可控，并且长期免费或低成本。\n\n- **Next.js**：负责构建。整个博客是一个静态优先的站点，文章、相册、美食都从内容源生成，运动数据则在请求时实时读取，保证新记录能及时出现。\n- **EdgeOne**：负责分发。作为面向中国大陆的入口，它承担了域名解析、边缘加速和访问控制，让页面在国内访问足够快。\n- **Cloudflare**：负责运动数据服务。Worker 接收上传，D1 保存标准化后的记录，R2 保存 JSON 快照，对外提供只读接口。\n\n内容来源上，博文、相册和美食通过 Obsidian 管理，运动数据来自 Apple 健康，经由 iPhone 快捷指令同步，室外运动轨迹由 WorkoutGPX 导出并上传。写作、记录、同步各自独立，互不干扰。\n\n## 关于我\n\n我是一名普通的开发者，喜欢把生活里的东西一点点数字化下来，也喜欢在折腾的过程中弄清楚一件事到底是怎么运转的。\n\n如果你对这里的任何内容感兴趣，或者只是想聊聊，欢迎通过下方的方式联系我。\n",
  "updatedAt": "2026-10-30T07:19:54.208Z"
};

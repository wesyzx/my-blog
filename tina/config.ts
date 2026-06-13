import { defineConfig } from "tinacms";

// Your hosting provider likely exposes this as an environment variable
const branch = process.env.HEAD || process.env.VERCEL_GIT_COMMIT_REF || "main";

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "static-id", // Get this from tina.io
  token: process.env.TINA_TOKEN || "static-token", // Get this from tina.io

  build: {
    outputFolder: "tina-admin",
    publicFolder: "public",
  },
  media: {
    loadCustomStore: async () => {
      const pack = await import("./upyun-media-store");
      return pack.UpyunMediaStore;
    },
  },
  schema: {
    collections: [
      {
        name: "post",
        label: "博文",
        path: "content/posts",
        fields: [
          {
            type: "string",
            name: "title",
            label: "标题",
            isTitle: true,
            required: true,
          },
          {
            type: "datetime",
            name: "date",
            label: "日期",
            required: true,
          },
          {
            type: "string",
            name: "category",
            label: "分类",
            options: ["生活", "技术", "摄影", "学习"],
          },
          {
            type: "string",
            name: "tags",
            label: "标签",
            list: true,
          },
          {
            type: "string",
            name: "excerpt",
            label: "摘要",
            ui: {
              component: "textarea",
            },
          },
          {
            type: "image",
            name: "cover",
            label: "封面图",
          },
          {
            type: "boolean",
            name: "published",
            label: "已发布",
          },
          {
            type: "rich-text",
            name: "body",
            label: "正文",
            isBody: true,
          },
        ],
      },
      {
        name: "say",
        label: "说说",
        path: "content/say",
        fields: [
          {
            type: "datetime",
            name: "date",
            label: "日期",
            required: true,
          },
          {
            type: "image",
            name: "image",
            label: "图片",
          },
          {
            type: "rich-text",
            name: "body",
            label: "内容",
            isBody: true,
          },
        ],
      },
      {
        name: "food",
        label: "美食",
        path: "content/food",
        fields: [
          {
            type: "string",
            name: "title",
            label: "标题",
            isTitle: true,
            required: true,
          },
          {
            type: "datetime",
            name: "date",
            label: "日期",
            required: true,
          },
          {
            type: "string",
            name: "location",
            label: "餐厅/地点",
          },
          {
            type: "string",
            name: "address",
            label: "地址",
          },
          {
            type: "number",
            name: "lng",
            label: "经度",
          },
          {
            type: "number",
            name: "lat",
            label: "纬度",
          },
          {
            type: "image",
            name: "cover",
            label: "封面图",
          },
          {
            type: "image",
            name: "images",
            label: "图集",
            list: true,
          },
          {
            type: "string",
            name: "tags",
            label: "标签",
            list: true,
          },
          {
            type: "string",
            name: "excerpt",
            label: "摘要",
            ui: {
              component: "textarea",
            },
          },
          {
            type: "boolean",
            name: "published",
            label: "已发布",
          },
          {
            type: "rich-text",
            name: "body",
            label: "正文",
            isBody: true,
          },
        ],
      },
      {
        name: "gallery",
        label: "相册",
        path: "content/gallery",
        fields: [
          {
            type: "string",
            name: "title",
            label: "标题",
            isTitle: true,
            required: true,
          },
          {
            type: "datetime",
            name: "date",
            label: "日期",
            required: true,
          },
          {
            type: "string",
            name: "category",
            label: "分类",
          },
          {
            type: "image",
            name: "cover",
            label: "封面图",
          },
          {
            type: "image",
            name: "images",
            label: "图片列表",
            list: true,
          },
          {
            type: "string",
            name: "excerpt",
            label: "摘要",
            ui: {
              component: "textarea",
            },
          },
          {
            type: "boolean",
            name: "published",
            label: "已发布",
          },
          {
            type: "rich-text",
            name: "body",
            label: "正文",
            isBody: true,
          },
        ],
      },
      {
        name: "more",
        label: "抽屉",
        path: "content/more",
        fields: [
          {
            type: "string",
            name: "title",
            label: "标题",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "desc",
            label: "描述",
          },
          {
            type: "string",
            name: "icon",
            label: "图标",
          },
          {
            type: "rich-text",
            name: "body",
            label: "正文",
            isBody: true,
          },
        ],
      },
      {
        name: "about",
        label: "关于",
        path: "content",
        match: {
          include: "about",
        },
        ui: {
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        fields: [
          {
            type: "rich-text",
            name: "body",
            label: "正文",
            isBody: true,
          },
        ],
      },
    ],
  },
});

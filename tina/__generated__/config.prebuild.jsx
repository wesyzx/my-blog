var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// tina/upyun-media-store.ts
var upyun_media_store_exports = {};
__export(upyun_media_store_exports, {
  UpyunMediaStore: () => UpyunMediaStore
});
var UpyunMediaStore;
var init_upyun_media_store = __esm({
  "tina/upyun-media-store.ts"() {
    "use strict";
    UpyunMediaStore = class {
      constructor() {
        this.accept = "image/*";
      }
      async persist(files) {
        const uploaded = [];
        for (const { file, directory } of files) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("directory", directory);
          const res = await fetch("/api/upyun", {
            method: "POST",
            body: formData
          });
          if (!res.ok) {
            console.error("Upload failed", await res.text());
            continue;
          }
          const data = await res.json();
          uploaded.push({
            id: data.src,
            type: "file",
            directory,
            filename: data.filename,
            src: data.src
          });
        }
        return uploaded;
      }
      async delete(media) {
        await fetch("/api/upyun", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ src: media.id })
        });
      }
      async list(options) {
        const directory = options?.directory || "/";
        const res = await fetch(`/api/upyun?dir=${encodeURIComponent(directory)}`);
        if (!res.ok) {
          return { items: [], totalCount: 0, nextOffset: void 0 };
        }
        const data = await res.json();
        const domain = process.env.NEXT_PUBLIC_UPYUN_DOMAIN || "";
        const items = (data.files || []).map((file) => {
          const basePath = directory === "/" ? "" : directory;
          const remotePath = `${basePath}/${file.name}`.replace(/\/\//g, "/");
          const isFile = file.type === "N";
          return {
            id: isFile ? `${domain}${remotePath}` : remotePath,
            type: isFile ? "file" : "dir",
            directory,
            filename: file.name,
            src: isFile ? `${domain}${remotePath}` : void 0
          };
        });
        return {
          items,
          totalCount: items.length,
          nextOffset: void 0
        };
      }
      previewSrc(src) {
        return Promise.resolve(src);
      }
    };
  }
});

// tina/config.ts
import { defineConfig } from "tinacms";
console.log("TinaCMS Build Config:", {
  branch: "main",
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID ? "Found" : "Missing",
  isLocal: process.env.TINA_PUBLIC_IS_LOCAL === "true"
});
var config_default = defineConfig({
  branch: "main",
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  local: process.env.TINA_PUBLIC_IS_LOCAL === "true",
  build: {
    outputFolder: "tina-admin",
    publicFolder: "public"
  },
  media: {
    loadCustomStore: async () => {
      const pack = await Promise.resolve().then(() => (init_upyun_media_store(), upyun_media_store_exports));
      return pack.UpyunMediaStore;
    }
  },
  schema: {
    collections: [
      {
        name: "post",
        label: "\u535A\u6587",
        path: "content/posts",
        fields: [
          {
            type: "string",
            name: "title",
            label: "\u6807\u9898",
            isTitle: true,
            required: true
          },
          {
            type: "datetime",
            name: "date",
            label: "\u65E5\u671F",
            required: true
          },
          {
            type: "string",
            name: "category",
            label: "\u5206\u7C7B",
            options: ["\u751F\u6D3B", "\u6280\u672F", "\u6444\u5F71", "\u5B66\u4E60"]
          },
          {
            type: "string",
            name: "tags",
            label: "\u6807\u7B7E",
            list: true
          },
          {
            type: "string",
            name: "excerpt",
            label: "\u6458\u8981",
            ui: {
              component: "textarea"
            }
          },
          {
            type: "image",
            name: "cover",
            label: "\u5C01\u9762\u56FE"
          },
          {
            type: "boolean",
            name: "published",
            label: "\u5DF2\u53D1\u5E03"
          },
          {
            type: "rich-text",
            name: "body",
            label: "\u6B63\u6587",
            isBody: true
          }
        ]
      },
      {
        name: "say",
        label: "\u8BF4\u8BF4",
        path: "content/say",
        fields: [
          {
            type: "datetime",
            name: "date",
            label: "\u65E5\u671F",
            required: true
          },
          {
            type: "image",
            name: "image",
            label: "\u56FE\u7247"
          },
          {
            type: "rich-text",
            name: "body",
            label: "\u5185\u5BB9",
            isBody: true
          }
        ]
      },
      {
        name: "food",
        label: "\u7F8E\u98DF",
        path: "content/food",
        fields: [
          {
            type: "string",
            name: "title",
            label: "\u6807\u9898",
            isTitle: true,
            required: true
          },
          {
            type: "datetime",
            name: "date",
            label: "\u65E5\u671F",
            required: true
          },
          {
            type: "string",
            name: "location",
            label: "\u9910\u5385/\u5730\u70B9"
          },
          {
            type: "string",
            name: "address",
            label: "\u5730\u5740"
          },
          {
            type: "number",
            name: "lng",
            label: "\u7ECF\u5EA6"
          },
          {
            type: "number",
            name: "lat",
            label: "\u7EAC\u5EA6"
          },
          {
            type: "image",
            name: "cover",
            label: "\u5C01\u9762\u56FE"
          },
          {
            type: "image",
            name: "images",
            label: "\u56FE\u96C6",
            list: true
          },
          {
            type: "string",
            name: "tags",
            label: "\u6807\u7B7E",
            list: true
          },
          {
            type: "string",
            name: "excerpt",
            label: "\u6458\u8981",
            ui: {
              component: "textarea"
            }
          },
          {
            type: "boolean",
            name: "published",
            label: "\u5DF2\u53D1\u5E03"
          },
          {
            type: "rich-text",
            name: "body",
            label: "\u6B63\u6587",
            isBody: true
          }
        ]
      },
      {
        name: "gallery",
        label: "\u76F8\u518C",
        path: "content/gallery",
        fields: [
          {
            type: "string",
            name: "title",
            label: "\u6807\u9898",
            isTitle: true,
            required: true
          },
          {
            type: "datetime",
            name: "date",
            label: "\u65E5\u671F",
            required: true
          },
          {
            type: "string",
            name: "category",
            label: "\u5206\u7C7B"
          },
          {
            type: "image",
            name: "cover",
            label: "\u5C01\u9762\u56FE"
          },
          {
            type: "image",
            name: "images",
            label: "\u56FE\u7247\u5217\u8868",
            list: true
          },
          {
            type: "string",
            name: "excerpt",
            label: "\u6458\u8981",
            ui: {
              component: "textarea"
            }
          },
          {
            type: "boolean",
            name: "published",
            label: "\u5DF2\u53D1\u5E03"
          },
          {
            type: "rich-text",
            name: "body",
            label: "\u6B63\u6587",
            isBody: true
          }
        ]
      },
      {
        name: "more",
        label: "\u62BD\u5C49",
        path: "content/more",
        fields: [
          {
            type: "string",
            name: "title",
            label: "\u6807\u9898",
            isTitle: true,
            required: true
          },
          {
            type: "string",
            name: "desc",
            label: "\u63CF\u8FF0"
          },
          {
            type: "string",
            name: "icon",
            label: "\u56FE\u6807"
          },
          {
            type: "rich-text",
            name: "body",
            label: "\u6B63\u6587",
            isBody: true
          }
        ]
      },
      {
        name: "about",
        label: "\u5173\u4E8E",
        path: "content",
        match: {
          include: "about"
        },
        ui: {
          allowedActions: {
            create: false,
            delete: false
          }
        },
        fields: [
          {
            type: "rich-text",
            name: "body",
            label: "\u6B63\u6587",
            isBody: true
          }
        ]
      }
    ]
  }
});
export {
  config_default as default
};

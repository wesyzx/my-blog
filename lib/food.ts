/**
 * 美食探店内容管理模块
 *
 * 读取 content/food/ 目录下的 Markdown 文件，
 * 每条探店记录包含地理位置（经纬度）、地址、图集等字段，
 * 并且支持自动从又拍云等图床读取图片的 EXIF 地理坐标。
 */
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

/** 探店记录存放目录 */
const foodDirectory = path.join(process.cwd(), 'content/food')

/** 探店记录元数据 */
export interface FoodMeta {
  slug: string
  title: string
  date: string
  location: string
  address: string
  lng: number
  lat: number
  cover: string
  images: string[]
  tags: string[]
  excerpt: string
  published: boolean
}

export interface FoodPost extends FoodMeta {
  content: string
}

/** 
 * 将 EXIF 中的坐标格式转换为十进制
 * 支持 "30,16,14.65" (DMS) 或 "30.271111" (Decimal)
 */
function parseGPS(gps?: string, ref?: string): number {
  if (!gps) return 0;
  
  // 处理常见的逗号或空格分隔
  const parts = gps.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
  
  let dec = 0;
  if (parts.length === 3) {
    // DMS 格式: [度, 分, 秒]
    dec = parts[0] + parts[1] / 60 + parts[2] / 3600;
  } else if (parts.length === 1) {
    // 十进制格式
    dec = parts[0];
  } else {
    return 0;
  }
  
  if (ref === 'S' || ref === 'W') dec = -dec;
  return Number(dec.toFixed(6));
}

/**
 * 尝试从图片 URL 获取 EXIF 经纬度
 * 适配又拍云的 !/meta 接口
 */
/**
 * 尝试从图片 URL 获取 EXIF 经纬度
 * 适配又拍云的 !/meta 接口，增加超时处理
 */
async function fetchExifLocation(imageUrl: string) {
  if (!imageUrl || !imageUrl.startsWith('http')) return { lng: 0, lat: 0 };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

    // 假设使用又拍云，通过 !/meta 获取图片元数据
    const res = await fetch(`${imageUrl}!/meta`, { 
      next: { revalidate: 86400 },
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) return { lng: 0, lat: 0 };
    
    const meta = await res.json();
    
    // 如果包含 EXIF 并且有 GPS 信息
    if (meta && meta.EXIF && meta.EXIF.GPSLatitude && meta.EXIF.GPSLongitude) {
      const lat = parseGPS(meta.EXIF.GPSLatitude, meta.EXIF.GPSLatitudeRef);
      const lng = parseGPS(meta.EXIF.GPSLongitude, meta.EXIF.GPSLongitudeRef);
      return { 
        lat: isNaN(lat) ? 0 : lat, 
        lng: isNaN(lng) ? 0 : lng 
      };
    }
    return { lng: 0, lat: 0 };
  } catch (err) {
    // 捕获超时或网络错误，不影响主流程
    console.error('Error fetching EXIF for', imageUrl, err);
    return { lng: 0, lat: 0 };
  }
}

/**
 * 解析和合并单个美食文件的元数据
 */
async function parseFoodMeta(fileName: string): Promise<FoodMeta | null> {
  try {
    const slug = fileName.replace(/\.md$/, '')
    const fullPath = path.join(foodDirectory, fileName)
    
    if (!fs.existsSync(fullPath)) return null;
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data } = matter(fileContents)

    if (data.published === false) return null;

    let lng = Number(data.lng);
    let lat = Number(data.lat);
    
    // 确保是有效的数字
    lng = isNaN(lng) ? 0 : lng;
    lat = isNaN(lat) ? 0 : lat;

    // 如果没有手动指定坐标，尝试从封面图或图集首张图片的又拍云 EXIF 中自动抓取
    if (lng === 0 || lat === 0) {
      const imagesToTry = [data.cover, ...(Array.isArray(data.images) ? data.images : [])]
        .filter((img): img is string => typeof img === 'string' && img.startsWith('http'));
        
      for (const imgUrl of imagesToTry.slice(0, 2)) { // 最多尝试前2张图片，减少请求
        const exifLoc = await fetchExifLocation(imgUrl);
        if (exifLoc.lng !== 0 && exifLoc.lat !== 0) {
          lng = exifLoc.lng;
          lat = exifLoc.lat;
          break;
        }
      }
    }

    // 安全解析日期
    let dateStr = '';
    if (data.date) {
      const d = new Date(data.date);
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString();
      }
    }

    return {
      slug,
      title: data.title || slug,
      date: dateStr,
      location: data.location || '',
      address: data.address || '',
      lng: isNaN(lng) ? 0 : lng,
      lat: isNaN(lat) ? 0 : lat,
      cover: data.cover || '',
      images: Array.isArray(data.images) 
        ? data.images.filter((img: any) => typeof img === 'string' && img.length > 0) 
        : [],
      tags: Array.isArray(data.tags) ? data.tags.map((t: unknown) => String(t)) : [],
      excerpt: data.excerpt || '',
      published: true,
    }
  } catch (err) {
    console.error(`Error parsing food meta for ${fileName}:`, err);
    return null;
  }
}

/**
 * 获取所有探店记录（按日期倒序）
 */
export async function getAllFoodPosts(): Promise<FoodMeta[]> {
  try {
    if (!fs.existsSync(foodDirectory)) return []

    const fileNames = fs.readdirSync(foodDirectory)
    const mdFiles = fileNames.filter((fileName) => {
      const fullPath = path.join(foodDirectory, fileName);
      return fileName.endsWith('.md') && fs.statSync(fullPath).isFile();
    })
    
    const postsPromises = mdFiles.map(parseFoodMeta)
    const posts = (await Promise.all(postsPromises)).filter((p): p is FoodMeta => p !== null)

    return posts.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date < b.date ? 1 : -1;
    })
  } catch (err) {
    console.error('Error getting all food posts:', err);
    return [];
  }
}

/**
 * 根据 slug 获取单篇探店详情
 */
export async function getFoodPostBySlug(slug: string): Promise<FoodPost | null> {
  try {
    const fileName = `${slug}.md`;
    const fullPath = path.join(foodDirectory, fileName)
    
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      return null;
    }

    const meta = await parseFoodMeta(fileName)
    if (!meta) return null;

    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { content } = matter(fileContents)

    return {
      ...meta,
      content,
    }
  } catch (err) {
    console.error(`Error getting food post by slug ${slug}:`, err);
    return null
  }
}

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
 */
async function fetchExifLocation(imageUrl: string) {
  if (!imageUrl.startsWith('http')) return { lng: 0, lat: 0 };
  try {
    const res = await fetch(`${imageUrl}?_exif`, { next: { revalidate: 86400 } });
    if (!res.ok) return { lng: 0, lat: 0 };
    const exif = await res.json();
    return {
      lat: parseGPS(exif.GPSLatitude, exif.GPSLatitudeRef),
      lng: parseGPS(exif.GPSLongitude, exif.GPSLongitudeRef),
    };
  } catch {
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

    let lng = Number(data.lng) || 0;
    let lat = Number(data.lat) || 0;

    // 如果没有手动指定坐标，尝试从封面图或图集首张图片的又拍云 EXIF 中自动抓取
    if (lng === 0 || lat === 0) {
      const imagesToTry = [data.cover, ...(Array.isArray(data.images) ? data.images : [])].filter(Boolean);
      for (const imgUrl of imagesToTry.slice(0, 3)) { // 最多尝试前3张图片
        const exifLoc = await fetchExifLocation(imgUrl);
        if (exifLoc.lng && exifLoc.lat) {
          lng = exifLoc.lng;
          lat = exifLoc.lat;
          break;
        }
      }
    }

    // 安全解析日期，防止无效日期导致 toISOString() 报错
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
      lng,
      lat,
      cover: data.cover || '',
      // 过滤掉空字符串或非字符串的图片链接
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
    const mdFiles = fileNames.filter((fileName) => fileName.endsWith('.md'))
    
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
    const meta = await parseFoodMeta(`${slug}.md`)
    if (!meta) return null;

    const fullPath = path.join(foodDirectory, `${slug}.md`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { content } = matter(fileContents)

    return {
      ...meta,
      content,
    }
  } catch {
    return null
  }
}

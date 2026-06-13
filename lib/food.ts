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
 * 将 EXIF 中的度分秒格式 (如 "30,16,14.65") 转换为十进制
 */
function parseGPS(gps?: string, ref?: string): number {
  if (!gps) return 0;
  const parts = gps.split(',').map(parseFloat);
  if (parts.length !== 3) return 0;
  let dec = parts[0] + parts[1] / 60 + parts[2] / 3600;
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
  const slug = fileName.replace(/\.md$/, '')
  const fullPath = path.join(foodDirectory, fileName)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data } = matter(fileContents)

  if (data.published === false) return null;

  let lng = Number(data.lng) || 0;
  let lat = Number(data.lat) || 0;

  // 如果没有手动指定坐标，尝试从封面图的又拍云 EXIF 中自动抓取
  if ((lng === 0 || lat === 0) && data.cover) {
    const exifLoc = await fetchExifLocation(data.cover);
    if (exifLoc.lng && exifLoc.lat) {
      lng = exifLoc.lng;
      lat = exifLoc.lat;
    }
  }

  return {
    slug,
    title: data.title || '',
    date: data.date ? new Date(data.date).toISOString() : '',
    location: data.location || '',
    address: data.address || '',
    lng,
    lat,
    cover: data.cover || '',
    images: Array.isArray(data.images) ? data.images : [],
    tags: Array.isArray(data.tags) ? data.tags.map((t: unknown) => String(t)) : [],
    excerpt: data.excerpt || '',
    published: true,
  }
}

/**
 * 获取所有探店记录（按日期倒序）
 */
export async function getAllFoodPosts(): Promise<FoodMeta[]> {
  if (!fs.existsSync(foodDirectory)) return []

  const fileNames = fs.readdirSync(foodDirectory)
  const mdFiles = fileNames.filter((fileName) => fileName.endsWith('.md'))
  
  const postsPromises = mdFiles.map(parseFoodMeta)
  const posts = (await Promise.all(postsPromises)).filter((p): p is FoodMeta => p !== null)

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
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

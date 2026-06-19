import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Parser from 'rss-parser';

dotenv.config({ path: '.env.local' });

const parser = new Parser();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

// Map to the underlying Data Source IDs, because the new SDK removed databases.query!
const POSTS_DS_ID = '6bff5b12-623c-4404-9e80-66c4b77f82eb';
const FOOD_DS_ID = '3806b772-5d3c-8046-88b8-000b3b624968';
const GALLERY_DS_ID = '64bd6b1e-26f0-4994-9c11-1232e3590807';
const MORE_DS_ID = '70208dcf-6091-4e54-af59-cf0b21ada509';
const ABOUT_PAGE_ID = process.env.NOTION_PAGE_ID_ABOUT || '3806b772-5d3c-800a-ad82-f36e01605957';

const getTitle = (prop) => prop?.title?.[0]?.plain_text || '';
const getRichText = (prop) => prop?.rich_text?.[0]?.plain_text || '';
const getDate = (prop) => prop?.date?.start || '';
const getCheckbox = (prop) => prop?.checkbox === true;
const getUrl = (prop) => prop?.url || '';
const getNumber = (prop) => prop?.number || 0;
const getSelect = (prop) => prop?.select?.name || '';
const getMultiSelect = (prop) => prop?.multi_select?.map(s => s.name) || [];

const getPropertyByName = (p, names) => {
  if (!p) return null;
  for (const name of names) {
    if (p[name] !== undefined) return p[name];
  }
  return null;
};

async function getPageMarkdown(pageId) {
  try {
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);
    return mdString.parent || '';
  } catch (e) {
    console.error(`Failed to get markdown for ${pageId}`, e.message);
    return '';
  }
}

async function parseGPS(gps, ref) {
  if (!gps) return 0;
  const parts = gps.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
  let dec = 0;
  if (parts.length === 3) {
    dec = parts[0] + parts[1] / 60 + parts[2] / 3600;
  } else if (parts.length === 1) {
    dec = parts[0];
  } else {
    return 0;
  }
  if (ref === 'S' || ref === 'W') dec = -dec;
  return Number(dec.toFixed(6));
}

async function fetchExifLocation(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('http')) return { lng: 0, lat: 0 };
  try {
    const res = await fetch(`${imageUrl}!/meta`);
    if (!res.ok) return { lng: 0, lat: 0 };
    const meta = await res.json();
    if (meta && meta.EXIF && meta.EXIF.GPSLatitude && meta.EXIF.GPSLongitude) {
      const lat = await parseGPS(meta.EXIF.GPSLatitude, meta.EXIF.GPSLatitudeRef);
      const lng = await parseGPS(meta.EXIF.GPSLongitude, meta.EXIF.GPSLongitudeRef);
      return { lat, lng };
    }
  } catch (err) {
    console.error(`  [EXIF] Failed for ${imageUrl}:`, err.message);
  }
  return { lng: 0, lat: 0 };
}

async function fetchImageMeta(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('http')) return { width: 1200, height: 800 };
  if (!imageUrl.includes('guanyan.me')) return { width: 1200, height: 800 };
  try {
    const res = await fetch(`${imageUrl}!/meta`);
    if (res.ok) {
      const meta = await res.json();
      if (meta.width && meta.height) {
        return { width: meta.width, height: meta.height };
      }
    }
  } catch (err) {
    console.error(`  [Meta] Failed for ${imageUrl}:`, err.message);
  }
  return { width: 1200, height: 800 };
}

const PI = 3.1415926535897932384626;
const a = 6378245.0;
const ee = 0.00669342162296594323;

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

function outOfChina(lng, lat) {
  return (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271);
}

function gcj02towgs84(lng, lat) {
  if (outOfChina(lng, lat)) {
    return [lng, lat];
  }
  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  let radlat = lat / 180.0 * PI;
  let magic = Math.sin(radlat);
  magic = 1.0 - ee * magic * magic;
  let sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);
  dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);
  let mglat = lat + dlat;
  let mglng = lng + dlng;
  return [lng * 2 - mglng, lat * 2 - mglat];
}

async function fetchCoordsByAmap(address) {
  const key = process.env.AMAP_KEY || process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key) {
    console.warn('  [Amap] ⚠️ Warning: AMAP_KEY / NEXT_PUBLIC_AMAP_KEY is missing. Geocoding will be skipped!');
    return { lng: 0, lat: 0 };
  }
  if (!address) return { lng: 0, lat: 0 };

  // 过滤掉地址中的中英文括号及括号内的提示文字（如 “(近中山广场)”、“（鼓楼地铁站A口步行360米）”）
  // 这些提示词常会严重干扰高德地图的文本地理编码解析器，导致其返回不准确的粗略坐标（例如地铁站中心）
  const cleanAddress = address
    .replace(/\(.*?\)/g, '')
    .replace(/（.*?）/g, '')
    .trim();

  try {
    const res = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(cleanAddress)}&key=${key}`
    );
    const data = await res.json();

    if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
      const [gcjLng, gcjLat] = data.geocodes[0].location.split(',').map(Number);
      const [lng, lat] = gcj02towgs84(gcjLng, gcjLat);
      return { lng, lat };
    }
  } catch (err) {
    console.error(`  [Amap] Failed for ${address} (cleaned: ${cleanAddress}):`, err.message);
  }
  return { lng: 0, lat: 0 };
}

async function bundleData() {
  console.log('🚀 Bundling all content data from Notion...');
  console.log('  [Debug] NOTION_TOKEN exists:', !!process.env.NOTION_TOKEN);
  console.log('  [Debug] Environment keys:', Object.keys(process.env).filter(k => k.startsWith('NOTION_')));

  if (!process.env.NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN is missing in .env.local');
    process.exit(1);
  }

  // 1. Posts
  console.log('  - Processing Posts...');
  let posts = [];
  try {
    const postsRes = await notion.dataSources.query({ data_source_id: POSTS_DS_ID });
    for (const page of postsRes.results) {
      const p = page.properties;
      if (getCheckbox(p.Published) === false && p.Published) continue;
      
      const slug = getRichText(p.Slug) || getTitle(p.Name);
      if (!slug) continue;

      const content = await getPageMarkdown(page.id);
      posts.push({
        slug,
        title: getTitle(p.Name),
        date: getDate(p.Date),
        category: getSelect(p.Category) || getRichText(p.Category) || '未分类',
        tags: getMultiSelect(p.Tags),
        excerpt: getRichText(p.Excerpt) || '',
        cover: getUrl(p.Cover),
        published: true,
        content
      });
    }
    posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (e) {
    console.error('Failed to fetch posts:', e.message);
  }

  // 2. Food
  console.log('  - Processing Food...');
  let food = [];
  try {
    const foodRes = await notion.dataSources.query({ data_source_id: FOOD_DS_ID });
    for (const page of foodRes.results) {
      const p = page.properties;
      
      const publishedProp = getPropertyByName(p, ['Published', 'published', '发布', '是否发布']);
      if (publishedProp !== null && getCheckbox(publishedProp) === false) continue;
      
      const title = getTitle(getPropertyByName(p, ['Name', '名称', 'data ']));
      const slug = getRichText(getPropertyByName(p, ['Slug', 'slug'])) || title;
      if (!slug) continue;

      const content = await getPageMarkdown(page.id);

      let lng = getNumber(getPropertyByName(p, ['Lng', 'lng', '经度']));
      let lat = getNumber(getPropertyByName(p, ['Lat', 'lat', '纬度']));

      const coverUrl = getUrl(getPropertyByName(p, ['Cover', 'cover', '封面', '封面图']));
      const locText = getRichText(getPropertyByName(p, ['Location', 'location', '地点', '商户名称']));
      const addrText = getRichText(getPropertyByName(p, ['Address', 'address', '地址']));
      const dateText = getDate(getPropertyByName(p, ['Date', 'date', '日期']));

      // 1. 如果 Notion 里没填经纬度，尝试从封面图 EXIF 抓取
      if (lng === 0 || lat === 0) {
        if (coverUrl) {
          console.log(`    [EXIF] Trying to fetch location for ${title}...`);
          const loc = await fetchExifLocation(coverUrl);
          if (loc.lng && loc.lat) {
            lng = loc.lng;
            lat = loc.lat;
          }
        }
      }

      // 2. 如果还是没坐标，尝试根据 Location 或 Address 字段通过高德地图转坐标
      const geocodeText = locText || addrText;
      if ((lng === 0 || lat === 0) && geocodeText) {
        console.log(`    [Amap] Geocoding location for ${title}: ${geocodeText}`);
        const loc = await fetchCoordsByAmap(geocodeText);
        if (loc.lng && loc.lat) {
          lng = loc.lng;
          lat = loc.lat;
        }
      }

      // 3. 提取正文中的图片作为图集
      const imageRegex = /!\[.*?\]\((.*?)\)/g;
      const images = [];
      let match;
      while ((match = imageRegex.exec(content)) !== null) {
        images.push(match[1]);
      }
      if (images.length === 0 && coverUrl) {
        images.push(coverUrl);
      }

      // 兼容 Notion 字段 Tags 可以是 multi_select 或 rich_text 类型
      const tagsProp = getPropertyByName(p, ['Tags', 'tags', '标签']);
      let tags = [];
      if (tagsProp) {
        if (tagsProp.type === 'multi_select') {
          tags = getMultiSelect(tagsProp);
        } else if (tagsProp.type === 'rich_text') {
          const text = getRichText(tagsProp);
          if (text) {
            tags = text.split(/[\s,，;；]+/).filter(Boolean);
          }
        }
      }

      const excerpt = getRichText(getPropertyByName(p, ['Excerpt', 'excerpt', '摘要'])) || '';

      food.push({
        slug,
        title,
        date: dateText,
        location: locText || title, // 如果地点为空，默认使用名称（用于地图气泡旁的精简标记）
        address: addrText || locText || '', // 如果详细地址为空，使用地点或空字符
        lng,
        lat,
        cover: coverUrl || '',
        images,
        tags,
        excerpt,
        published: publishedProp === null ? true : getCheckbox(publishedProp),
        content
      });
    }
    food.sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (e) {
    console.error('Failed to fetch food:', e.message);
  }

  // 3. Gallery
  console.log('  - Processing Gallery...');
  let gallery = [];
  try {
    const galleryRes = await notion.dataSources.query({ data_source_id: GALLERY_DS_ID });
    for (const page of galleryRes.results) {
      const p = page.properties;
      if (getCheckbox(p.Published) === false && p.Published) continue;
      
      const title = getTitle(p.Name);
      const slug = getRichText(p.Slug) || getRichText(p.slug) || title;
      if (!slug) continue;

      const content = await getPageMarkdown(page.id);
      
      const imageRegex = /!\[.*?\]\((.*?)\)/g;
      const images = [];
      let match;
      while ((match = imageRegex.exec(content)) !== null) {
        const src = match[1];
        const meta = await fetchImageMeta(src);
        images.push({ src, width: meta.width, height: meta.height });
      }

      if (images.length === 0 && getUrl(p.Cover)) {
        const coverUrl = getUrl(p.Cover);
        const meta = await fetchImageMeta(coverUrl);
        images.push({ src: coverUrl, width: meta.width, height: meta.height });
      }

      gallery.push({
        slug,
        title,
        date: getDate(p.Date),
        category: getSelect(p.Category) || getRichText(p.Category) || '日常',
        cover: getUrl(p.Cover),
        images: images,
        excerpt: getRichText(p.Excerpt) || '',
        published: getCheckbox(p.Published) !== false,
        content
      });
    }
    gallery.sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch (e) {
    console.error('Failed to fetch gallery:', e.message);
  }

  // 4. More
  console.log('  - Processing More content...');
  let more = [];
  try {
    const moreRes = await notion.dataSources.query({ data_source_id: MORE_DS_ID });
    for (const page of moreRes.results) {
      const p = page.properties;
      const title = getTitle(p.Name);
      const slug = getRichText(p.Slug) || getRichText(p.slug) || title;
      if (!slug) continue;

      const content = await getPageMarkdown(page.id);
      more.push({
        slug,
        title,
        desc: getRichText(p.Desc),
        icon: getRichText(p.Icon),
        content
      });
    }
  } catch (e) {
    console.error('Failed to fetch more:', e.message);
  }

  // 5. About
  console.log('  - Processing About page...');
  let about = '';
  try {
    const md = await getPageMarkdown(ABOUT_PAGE_ID);
    if (md) about = md;
  } catch (e) {
    console.error('Failed to fetch about from Notion:', e.message);
  }
  if (!about) {
    console.log('    Falling back to local about.md...');
    const aboutFile = path.join(process.cwd(), 'content/about.md');
    if (fs.existsSync(aboutFile)) {
      about = fs.readFileSync(aboutFile, 'utf8');
    }
  }

  // 6. Douban
  console.log('  - Fetching Douban Interests...');
  const DOUBAN_ID = 'ahshq';
  let douban = [];
  try {
    const res = await fetch(`https://www.douban.com/feed/people/${DOUBAN_ID}/interests`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    if (res.ok) {
      const xml = await res.text();
      const feed = await parser.parseString(xml);
      douban = feed.items.map(item => {
        const content = item.content || item.contentSnippet || '';
        const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
        const cover = imgMatch ? imgMatch[1] : '';
        const pMatches = [...(content.matchAll(/<p>(.*?)<\/p>/g) || [])];
        let rating = '';
        let comment = '';
        if (pMatches.length >= 2) {
          const text = pMatches[0][1];
          if (text.includes('推荐: ')) {
            const stars = text.split('推荐: ')[1];
            rating = '★'.repeat(parseInt(stars) || 0) + '☆'.repeat(5 - (parseInt(stars) || 0));
          }
          comment = pMatches[pMatches.length - 1][1];
        }
        let action = '看过';
        let type = 'movie';
        if (item.title.includes('想读') || item.title.includes('在读') || item.title.includes('读过')) {
          type = 'book';
          action = item.title.slice(0, 2);
        } else if (item.title.includes('想看') || item.title.includes('在看') || item.title.includes('看过')) {
          type = 'movie';
          action = item.title.slice(0, 2);
        } else if (item.title.includes('想听') || item.title.includes('在听') || item.title.includes('听过')) {
          type = 'music';
          action = item.title.slice(0, 2);
        } else if (item.title.includes('想玩') || item.title.includes('在玩') || item.title.includes('玩过')) {
          type = 'game';
          action = item.title.slice(0, 2);
        }
        return {
          id: item.guid || item.link || Math.random().toString(),
          title: item.title.split(action)[1]?.trim() || item.title,
          link: item.link || '',
          cover,
          rating,
          comment,
          date: item.pubDate || '',
          type,
          action
        };
      });
    }
  } catch (err) {
    console.error('  [Douban] Failed to fetch:', err.message);
  }

  const bundle = {
    posts,
    food,
    gallery,
    more,
    about,
    douban,
    updatedAt: new Date().toISOString()
  };

  const output = `/**
 * This file is auto-generated by scripts/bundle-data.mjs
 * Fetched from Notion API. DO NOT EDIT MANUALLY.
 */
export const bundleData = ${JSON.stringify(bundle, null, 2)};
`;

  fs.writeFileSync(path.join(process.cwd(), 'lib/data-bundle.ts'), output);
  console.log('✅ Data bundle generated successfully from Notion!');
}

bundleData().catch(err => {
  console.error('❌ Data bundling failed:', err);
  process.exit(1);
});

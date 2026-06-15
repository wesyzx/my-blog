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

async function fetchCoordsByAmap(address) {
  const key = process.env.AMAP_KEY || process.env.NEXT_PUBLIC_AMAP_KEY;
  if (!key || !address) return { lng: 0, lat: 0 };

  try {
    const res = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&key=${key}`
    );
    const data = await res.json();

    if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
      const [lng, lat] = data.geocodes[0].location.split(',').map(Number);
      return { lng, lat };
    }
  } catch (err) {
    console.error(`  [Amap] Failed for ${address}:`, err.message);
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
      if (getCheckbox(p.Published) === false && p.Published) continue;
      
      const title = getTitle(p.Name) || getTitle(p['名称']) || getTitle(p['data ']);
      const slug = getRichText(p.Slug) || getRichText(p.slug) || title;
      if (!slug) continue;

      const content = await getPageMarkdown(page.id);

      let lng = getNumber(p.Lng);
      let lat = getNumber(p.Lat);

      // 1. 如果 Notion 里没填经纬度，尝试从封面图 EXIF 抓取
      if (lng === 0 || lat === 0) {
        const coverUrl = getUrl(p.Cover);
        if (coverUrl) {
          console.log(`    [EXIF] Trying to fetch location for ${title}...`);
          const loc = await fetchExifLocation(coverUrl);
          if (loc.lng && loc.lat) {
            lng = loc.lng;
            lat = loc.lat;
          }
        }
      }

      // 2. 如果还是没坐标，尝试根据 Location 字段通过高德地图转坐标
      if ((lng === 0 || lat === 0) && getRichText(p.Location)) {
        console.log(`    [Amap] Geocoding location for ${title}: ${getRichText(p.Location)}`);
        const loc = await fetchCoordsByAmap(getRichText(p.Location));
        if (loc.lng && loc.lat) {
          lng = loc.lng;
          lat = loc.lat;
        }
      }

      food.push({
        slug,
        title,
        date: getDate(p.Date),
        location: getRichText(p.Location),
        address: getRichText(p.Address),
        lng,
        lat,
        cover: getUrl(p.Cover),
        images: [],
        tags: [],
        excerpt: '',
        published: true,
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
        images.push(match[1]);
      }

      gallery.push({
        slug,
        title,
        date: getDate(p.Date),
        category: getSelect(p.Category) || getRichText(p.Category) || '日常',
        cover: getUrl(p.Cover),
        images: images,
        excerpt: getRichText(p.Excerpt) || '',
        published: true,
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

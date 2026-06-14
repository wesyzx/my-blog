import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Parser from 'rss-parser';

const parser = new Parser();

const CONTENT_DIR = path.join(process.cwd(), 'content');

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

async function bundleData() {
  console.log('🚀 Bundling all content data for production...');

  // 1. Posts
  console.log('  - Processing Posts...');
  const postsDir = path.join(CONTENT_DIR, 'posts');
  const posts = [];
  if (fs.existsSync(postsDir)) {
    const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const raw = fs.readFileSync(path.join(postsDir, f), 'utf8');
      const { data, content } = matter(raw);
      if (data.published === false) continue;
      posts.push({
        slug: f.replace(/\.md$/, ''),
        title: data.title || '',
        date: data.date ? new Date(data.date).toISOString() : '',
        category: data.category || '未分类',
        tags: Array.isArray(data.tags) ? data.tags : [],
        excerpt: data.excerpt || '',
        cover: data.cover || '',
        published: true,
        content
      });
    }
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  // 2. Food (with EXIF)
  console.log('  - Processing Food (including EXIF)...');
  const foodDir = path.join(CONTENT_DIR, 'food');
  const food = [];
  if (fs.existsSync(foodDir)) {
    const files = fs.readdirSync(foodDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const raw = fs.readFileSync(path.join(foodDir, f), 'utf8');
      const { data, content } = matter(raw);
      if (data.published === false) continue;
      
      let lng = Number(data.lng) || 0;
      let lat = Number(data.lat) || 0;
      if (lng === 0 || lat === 0) {
        const images = [data.cover, ...(Array.isArray(data.images) ? data.images : [])].filter(Boolean);
        for (const img of images.slice(0, 2)) {
          const loc = await fetchExifLocation(img);
          if (loc.lng && loc.lat) {
            lng = loc.lng;
            lat = loc.lat;
            break;
          }
        }
      }

      food.push({
        slug: f.replace(/\.md$/, ''),
        title: data.title || '',
        date: data.date ? new Date(data.date).toISOString() : '',
        location: data.location || '',
        address: data.address || '',
        lng,
        lat,
        cover: data.cover || '',
        images: Array.isArray(data.images) ? data.images : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        excerpt: data.excerpt || '',
        published: true,
        content
      });
    }
  }
  food.sort((a, b) => (a.date < b.date ? 1 : -1));

  // 3. Gallery
  console.log('  - Processing Gallery...');
  const galleryDir = path.join(CONTENT_DIR, 'gallery');
  const gallery = [];
  if (fs.existsSync(galleryDir)) {
    const files = fs.readdirSync(galleryDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const raw = fs.readFileSync(path.join(galleryDir, f), 'utf8');
      const { data, content } = matter(raw);
      if (data.published === false) continue;
      gallery.push({
        slug: f.replace(/\.md$/, ''),
        title: data.title || '',
        date: data.date ? new Date(data.date).toISOString() : '',
        category: data.category || '日常',
        cover: data.cover || '',
        images: Array.isArray(data.images) ? data.images : [],
        excerpt: data.excerpt || '',
        published: true,
        content
      });
    }
  }
  gallery.sort((a, b) => (a.date < b.date ? 1 : -1));

  // 4. Say
  console.log('  - Processing Says...');
  const sayDir = path.join(CONTENT_DIR, 'say');
  const says = [];
  if (fs.existsSync(sayDir)) {
    const files = fs.readdirSync(sayDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const raw = fs.readFileSync(path.join(sayDir, f), 'utf8');
      const { data, content } = matter(raw);
      says.push({
        slug: f.replace(/\.md$/, ''),
        date: data.date ? new Date(data.date).toISOString() : '',
        content: content.trim(),
        image: data.image || undefined
      });
    }
  }
  says.sort((a, b) => (a.date < b.date ? 1 : -1));

  // 5. More
  console.log('  - Processing More content...');
  const moreDir = path.join(CONTENT_DIR, 'more');
  const more = [];
  if (fs.existsSync(moreDir)) {
    const files = fs.readdirSync(moreDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const raw = fs.readFileSync(path.join(moreDir, f), 'utf8');
      const { data, content } = matter(raw);
      more.push({
        slug: f.replace(/\.md$/, ''),
        title: data.title || '',
        desc: data.desc || '',
        icon: data.icon || '',
        content
      });
    }
  }

  // 6. About
  console.log('  - Processing About page...');
  let about = '';
  const aboutFile = path.join(CONTENT_DIR, 'about.md');
  if (fs.existsSync(aboutFile)) {
    about = fs.readFileSync(aboutFile, 'utf8');
  }

  // 7. Douban
  console.log('  - Fetching Douban Interests (Pre-bundle)...');
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
    says,
    more,
    about,
    douban,
    updatedAt: new Date().toISOString()
  };

  const output = `/**
 * This file is auto-generated by scripts/bundle-data.mjs
 * DO NOT EDIT MANUALLY
 */
export const bundleData = ${JSON.stringify(bundle, null, 2)};
`;

  fs.writeFileSync(path.join(process.cwd(), 'lib/data-bundle.ts'), output);
  console.log('✅ Data bundle generated successfully in lib/data-bundle.ts');
}

bundleData().catch(err => {
  console.error('❌ Data bundling failed:', err);
  process.exit(1);
});

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

const POSTS_DB_ID = process.env.NOTION_DB_POSTS || 'c10c5875-12d3-4736-84dc-ad5db31b3df1';
const FOOD_DB_ID = process.env.NOTION_DB_FOOD || '3806b772-5d3c-8009-8eea-d632c71bbe68';
const GALLERY_DB_ID = process.env.NOTION_DB_GALLERY || 'c61ad2b0-cc78-4f3a-940d-3b14a79561e1';
const MORE_DB_ID = process.env.NOTION_DB_MORE || 'fccdb5fe-8ca8-4344-b170-e7b9bd45d9e9';
const ABOUT_PAGE_ID = process.env.NOTION_PAGE_ID_ABOUT || '3806b772-5d3c-800a-ad82-f36e01605957';

// Helpers to parse Notion properties safely
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

async function bundleData() {
  console.log('🚀 Bundling all content data from Notion...');

  if (!process.env.NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN is missing in .env.local');
    process.exit(1);
  }

  // 1. Posts
  console.log('  - Processing Posts...');
  let posts = [];
  try {
    const postsRes = await notion.databases.query({ database_id: POSTS_DB_ID });
    for (const page of postsRes.results) {
      const p = page.properties;
      if (getCheckbox(p.Published) === false) continue;
      
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
    const foodRes = await notion.databases.query({ database_id: FOOD_DB_ID });
    for (const page of foodRes.results) {
      const p = page.properties;
      if (getCheckbox(p.Published) === false && p.Published) continue; // Default allow if property missing
      
      const title = getTitle(p.Name) || getTitle(p['名称']) || getTitle(p['data ']);
      const slug = getRichText(p.Slug) || getRichText(p.slug) || title;
      if (!slug) continue;

      const content = await getPageMarkdown(page.id);
      food.push({
        slug,
        title,
        date: getDate(p.Date),
        location: getRichText(p.Location),
        address: getRichText(p.Address),
        lng: getNumber(p.Lng),
        lat: getNumber(p.Lat),
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
    const galleryRes = await notion.databases.query({ database_id: GALLERY_DB_ID });
    for (const page of galleryRes.results) {
      const p = page.properties;
      if (getCheckbox(p.Published) === false && p.Published) continue;
      
      const title = getTitle(p.Name);
      const slug = getRichText(p.Slug) || getRichText(p.slug) || title;
      if (!slug) continue;

      const content = await getPageMarkdown(page.id);
      gallery.push({
        slug,
        title,
        date: getDate(p.Date),
        category: getSelect(p.Category) || getRichText(p.Category) || '日常',
        cover: getUrl(p.Cover),
        images: [],
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
    const moreRes = await notion.databases.query({ database_id: MORE_DB_ID });
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
  if (ABOUT_PAGE_ID) {
    about = await getPageMarkdown(ABOUT_PAGE_ID);
  }

  // 6. Douban
  console.log('  - Fetching Douban Interests...');
  const DOUBAN_ID = 'ahshq';
  let douban = [];
  try {
    const res = await fetch(`https://www.douban.com/feed/people/${DOUBAN_ID}/interests`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      }
    });
    if (res.ok) {
      const xml = await res.text();
      const feed = await parser.parseString(xml);
      douban = feed.items.map(item => {
        // ... abbreviated logic ...
        return {
          id: item.guid || item.link || Math.random().toString(),
          title: item.title,
          link: item.link || '',
          cover: '',
          rating: '',
          comment: '',
          date: item.pubDate || '',
          type: 'movie',
          action: '看过'
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

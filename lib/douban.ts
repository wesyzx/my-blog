import Parser from 'rss-parser';
import { bundleData } from './data-bundle'

const parser = new Parser();

const isDev = process.env.NODE_ENV === 'development'

export interface DoubanItem {
  id: string;
  title: string;
  link: string;
  cover: string;
  rating?: string;
  comment?: string;
  date: string;
  type: 'book' | 'movie' | 'music' | 'game' | 'unknown';
  action: string;
}

export async function getDoubanInterests(userId: string): Promise<DoubanItem[]> {
  if (!isDev) {
    return bundleData.douban as DoubanItem[];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

    // 使用 Next.js 原生 fetch 以支持缓存 (revalidate)
    const res = await fetch(`https://www.douban.com/feed/people/${userId}/interests`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 }, // 每小时重新验证一次
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`Failed to fetch Douban RSS: ${res.status} ${res.statusText}`);
      return [];
    }

    const xml = await res.text();
    const feed = await parser.parseString(xml);

    return feed.items.map((item) => {
      const content = item.content || item.contentSnippet || '';
      
      // 提取封面图
      const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
      const cover = imgMatch ? imgMatch[1] : '';

      // 提取评分和短评
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

      // 识别动作（读过/看过/听过/玩过）
      let action = '看过';
      let type: DoubanItem['type'] = 'movie';
      
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
  } catch (error) {
    console.error("Error fetching or parsing Douban RSS:", error);
    return [];
  }
}

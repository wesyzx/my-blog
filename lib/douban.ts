import Parser from 'rss-parser';

const parser = new Parser();

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
  try {
    // 使用 Next.js 原生 fetch 以支持缓存 (revalidate)
    const res = await fetch(`https://www.douban.com/feed/people/${userId}/interests`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 } // 每小时重新验证一次
    });

    if (!res.ok) {
      console.error(`Failed to fetch Douban RSS: ${res.status} ${res.statusText}`);
      return [];
    }

    const xml = await res.text();
    const feed = await parser.parseString(xml);
    
    return feed.items.map(item => {
      // 1. 从 description 中提取封面图
      const content = item.content || item.contentSnippet || '';
      const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
      const cover = imgMatch ? imgMatch[1] : '';

      // 2. 提取评分和短评
      const pMatches = [...(content.matchAll(/<p>(.*?)<\/p>/g) || [])];
      let rating = '';
      let comment = '';
      
      pMatches.forEach(match => {
        const text = match[1];
        if (text.startsWith('推荐:')) rating = text.replace('推荐:', '').trim();
        else if (text.startsWith('备注:')) comment = text.replace('备注:', '').trim();
      });

      // 3. 确定类型
      let type: DoubanItem['type'] = 'unknown';
      if (item.link?.includes('book.douban.com')) type = 'book';
      else if (item.link?.includes('movie.douban.com')) type = 'movie';
      else if (item.link?.includes('music.douban.com')) type = 'music';
      else if (item.link?.includes('game.douban.com')) type = 'game';

      // 4. 提取动作和标题 (例如 "想看《阿飞正传》")
      let action = '';
      let title = item.title || '';
      const titleMatch = item.title?.match(/^(.*?)《(.*?)》/);
      if (titleMatch) {
        action = titleMatch[1];
        title = titleMatch[2];
      }

      return {
        id: item.guid || item.link || Date.now().toString() + Math.random(),
        title,
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

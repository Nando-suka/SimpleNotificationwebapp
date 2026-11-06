import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'CVE-Dashboard-Portfolio/1.0',
  },
});

// Daftar sumber RSS yang kita pakai
const RSS_SOURCES = [
  {
    name: 'The Hacker News',
    url: 'https://feeds.feedburner.com/TheHackersNews',
  },
  {
    name: 'BleepingComputer',
    url: 'https://www.bleepingcomputer.com/feed/',
  },
  {
    name: 'SecurityWeek',
    url: 'https://www.securityweek.com/feed/',
  },
];

/**
 * Ambil berita dari semua sumber RSS
 */
export async function fetchSecurityNews() {
  console.log('Mengambil berita dari RSS...');

  const allNews = [];

  for (const source of RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      const items = feed.items || [];

      console.log(`- ${source.name}: ${items.length} berita`);

      for (const item of items) {
        const newsItem = {
          title: item.title?.trim() || 'No Title',
          url: item.link?.trim(),
          source_name: source.name,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
          summary: item.contentSnippet?.trim() || item.summary?.trim() || null,
        };

        // Hanya ambil yang punya URL valid
        if (newsItem.url) {
          allNews.push(newsItem);
        }
      }
    } catch (error) {
      console.error(`Gagal mengambil RSS dari ${source.name}:`, error.message);
    }
  }

  console.log(`Total berita berhasil diambil: ${allNews.length}`);
  return allNews;
}

/**
 * Cari CVE ID di dalam teks (judul + summary)
 * Contoh yang berhasil ditangkap: CVE-2024-12345, CVE-2025-0001
 */
export function extractCVEIds(text = '') {
  if (!text) return [];

  const regex = /CVE-\d{4}-\d{4,}/gi;
  const matches = text.match(regex) || [];

  // Hilangkan duplikat dan samakan format
  const unique = [...new Set(matches.map((id) => id.toUpperCase()))];
  return unique;
}
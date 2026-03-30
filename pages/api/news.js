// pages/api/news.js
// Free: Google News RSS feed (Korean oil market news)

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < 10) {
    const block = match[1];

    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const source = extractSource(block);

    if (title) {
      items.push({
        title: cleanCDATA(title),
        link: cleanCDATA(link),
        pubDate,
        source: cleanCDATA(source),
      });
    }
  }
  return items;
}

function extractTag(text, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const m = regex.exec(text);
  return m ? m[1].trim() : "";
}

function extractSource(text) {
  const regex = /<source[^>]*>([\s\S]*?)<\/source>/;
  const m = regex.exec(text);
  return m ? m[1].trim() : "";
}

function cleanCDATA(text) {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function timeAgo(dateStr) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHr < 24) return `${diffHr}시간 전`;
    return `${diffDay}일 전`;
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  const queries = [
    "유가 원유 국제유가",
    "중동 이란 호르무즈 원유",
    "윤활유 베이스오일 첨가제 원자재",
  ];

  const allItems = [];

  for (const q of queries) {
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;
      const resp = await fetch(rssUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!resp.ok) continue;
      const xml = await resp.text();
      const items = parseRSS(xml);
      allItems.push(...items);
    } catch {
      // skip failed queries
    }
  }

  // Deduplicate by title
  const seen = new Set();
  const unique = [];
  for (const item of allItems) {
    const key = item.title.slice(0, 30);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({
        ...item,
        timeAgo: timeAgo(item.pubDate),
      });
    }
  }

  // Sort by date (newest first) and limit to 12
  unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const final = unique.slice(0, 12);

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json({
    news: final,
    fetchedAt: new Date().toISOString(),
  });
}

import Parser from "rss-parser";
import type { RawHeadline } from "./types";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "real-or-fake/0.1 (https://real-or-fake.app ingestion bot)",
  },
});

const FEEDS: { url: string; source: string; limit?: number }[] = [
  // Tabloid / weird news
  { url: "https://nypost.com/weird-but-true/feed/", source: "NY Post Weird But True" },
  { url: "https://www.thesun.co.uk/news/weird-news/feed/", source: "The Sun Weird" },
  { url: "https://metro.co.uk/news/weird/feed/", source: "Metro Weird" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC News", limit: 20 },
  // Major metro / regional papers
  { url: "https://www.latimes.com/california/rss2.0.xml", source: "LA Times", limit: 20 },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/US.xml", source: "NY Times", limit: 20 },
  { url: "https://feeds.washingtonpost.com/rss/national", source: "Washington Post", limit: 20 },
  { url: "https://www.chron.com/news/feed/", source: "Houston Chronicle", limit: 15 },
  { url: "https://www.ajc.com/news/feed/", source: "Atlanta Journal-Constitution", limit: 15 },
  { url: "https://feeds.denverpost.com/dp-news-breaking-local", source: "Denver Post", limit: 15 },
  { url: "https://www.miamiherald.com/latest-news/feed/", source: "Miami Herald", limit: 15 },
  { url: "https://www.dallasnews.com/news/feed/", source: "Dallas Morning News", limit: 15 },
  { url: "https://www.seattletimes.com/feed/", source: "Seattle Times", limit: 15 },
  { url: "https://www.sfchronicle.com/feed/", source: "SF Chronicle", limit: 15 },
];

export async function fetchRSSFeeds(): Promise<RawHeadline[]> {
  const results: RawHeadline[] = [];
  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const limit = feed.limit ?? 30;
      for (const item of parsed.items.slice(0, limit)) {
        if (!item.title) continue;
        results.push({
          headline: item.title.trim(),
          source_url: item.link ?? feed.url,
          source_name: feed.source,
        });
      }
    } catch (e) {
      console.error("[rss]", feed.url, e);
    }
  }
  return results;
}

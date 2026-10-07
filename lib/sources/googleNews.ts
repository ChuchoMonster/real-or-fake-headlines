import Parser from "rss-parser";
import type { RawHeadline } from "./types";

const parser = new Parser({ timeout: 10000 });

// Keep queries tight. Broad "weird news"/"unusual story" queries pulled a lot
// of local-syndication noise ("Unusual story of a Gombe varsity student…"),
// so we stick to narrow phrases that reliably return playable headlines.
const QUERIES = [
  "florida man",
  "florida woman",
];

export async function fetchGoogleNews(): Promise<RawHeadline[]> {
  const results: RawHeadline[] = [];
  for (const q of QUERIES) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
      const parsed = await parser.parseURL(url);
      for (const item of parsed.items.slice(0, 25)) {
        if (!item.title) continue;
        // Google News formats titles as "Headline - Source Name"
        const match = item.title.match(/^(.*) - ([^-]+)$/);
        const headline = match ? match[1].trim() : item.title.trim();
        const source = match ? match[2].trim() : "Google News";
        results.push({
          headline,
          source_url: item.link ?? "",
          source_name: source,
        });
      }
    } catch (e) {
      console.error("[googleNews]", q, e);
    }
  }
  return results;
}

import type { RawHeadline } from "./types";

const CATEGORIES = ["general", "entertainment", "science", "technology"];

type NewsAPIResponse = {
  articles?: Array<{
    title: string | null;
    url: string | null;
    source: { name: string | null } | null;
  }>;
};

function cleanTitle(title: string, sourceName: string): string {
  // Strip trailing " - Source Name" suffix when it duplicates the source.
  const suffix = new RegExp(` - ${sourceName}$`, "i");
  return title.replace(suffix, "").trim();
}

export async function fetchNewsAPI(): Promise<RawHeadline[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) {
    console.warn("[newsapi] NEWSAPI_KEY not set, skipping");
    return [];
  }

  const results: RawHeadline[] = [];
  for (const category of CATEGORIES) {
    try {
      const url = `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=30&apiKey=${key}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.warn("[newsapi]", category, "http", res.status);
        continue;
      }
      const data = (await res.json()) as NewsAPIResponse;
      for (const a of data.articles ?? []) {
        if (!a.title || a.title === "[Removed]") continue;
        if (!a.url) continue;
        const sourceName = a.source?.name ?? "NewsAPI";
        results.push({
          headline: cleanTitle(a.title, sourceName),
          source_url: a.url,
          source_name: sourceName,
        });
      }
    } catch (e) {
      console.error("[newsapi]", category, e);
    }
  }
  return results;
}

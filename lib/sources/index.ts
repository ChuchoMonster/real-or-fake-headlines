import { fetchGoogleNews } from "./googleNews";
import { fetchNewsAPI } from "./newsapi";
import { fetchReddit } from "./reddit";
import { fetchRSSFeeds } from "./rss";
import type { RawHeadline } from "./types";

export type FetchStats = {
  total: number;
  bySource: Record<string, number>;
};

export async function fetchAllRealHeadlines(): Promise<{
  headlines: RawHeadline[];
  stats: FetchStats;
}> {
  const results = await Promise.allSettled([
    fetchNewsAPI(),
    fetchReddit(),
    fetchRSSFeeds(),
    fetchGoogleNews(),
  ]);
  const labels = ["newsapi", "reddit", "rss", "googlenews"];
  const all: RawHeadline[] = [];
  const bySource: Record<string, number> = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      all.push(...r.value);
      bySource[labels[i]] = r.value.length;
    } else {
      bySource[labels[i]] = 0;
      console.error(`[sources] ${labels[i]} failed:`, r.reason);
    }
  });
  return { headlines: all, stats: { total: all.length, bySource } };
}

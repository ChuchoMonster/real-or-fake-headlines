import type { RawHeadline } from "./types";

// r/floridaman intentionally omitted — Florida content is already well-covered
// by other sources and tends to saturate the pool.
const SUBREDDITS = [
  "nottheonion",
  "offbeat",
  "NewsOfTheWeird",
  "NewsOfTheStupid",
];

type RedditListing = {
  data?: {
    children?: Array<{
      data: {
        title?: string;
        url?: string;
        permalink?: string;
        over_18?: boolean;
        stickied?: boolean;
      };
    }>;
  };
};

export async function fetchReddit(): Promise<RawHeadline[]> {
  const ua = process.env.REDDIT_USER_AGENT || "real-or-fake/0.1";
  const results: RawHeadline[] = [];

  for (const sub of SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${sub}/top.json?limit=75&t=week`;
      const res = await fetch(url, {
        headers: { "User-Agent": ua },
        cache: "no-store",
      });
      if (!res.ok) {
        console.warn("[reddit]", sub, "http", res.status);
        continue;
      }
      const data = (await res.json()) as RedditListing;
      for (const child of data.data?.children ?? []) {
        const post = child.data;
        if (!post?.title || post.over_18 || post.stickied) continue;
        results.push({
          headline: post.title.trim(),
          source_url: post.url ?? `https://www.reddit.com${post.permalink ?? ""}`,
          source_name: `r/${sub}`,
        });
      }
    } catch (e) {
      console.error("[reddit]", sub, e);
    }
  }
  return results;
}

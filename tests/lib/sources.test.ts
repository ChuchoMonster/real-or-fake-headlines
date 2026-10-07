import { beforeEach, describe, expect, it, vi } from "vitest";

const { parseURL } = vi.hoisted(() => ({ parseURL: vi.fn() }));
vi.mock("rss-parser", () => ({
  default: class {
    parseURL = parseURL;
  },
}));

import { fetchGoogleNews } from "@/lib/sources/googleNews";
import { fetchNewsAPI } from "@/lib/sources/newsapi";
import { fetchReddit } from "@/lib/sources/reddit";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  parseURL.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("fetchNewsAPI", () => {
  it("skips the network entirely when NEWSAPI_KEY is not set", async () => {
    vi.stubEnv("NEWSAPI_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchNewsAPI()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("strips the duplicated source suffix, drops removed or link-less articles, and survives a failed category", async () => {
    vi.stubEnv("NEWSAPI_KEY", "test-key");
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("category=science")) return json({}, 500);
      if (!url.includes("category=general")) return json({ articles: [] });
      return json({
        articles: [
          { title: "Ferry captain rescued stranded swan from harbor - Daily Gazette", url: "https://example.test/1", source: { name: "Daily Gazette" } },
          { title: "[Removed]", url: "https://example.test/2", source: { name: "Daily Gazette" } },
          { title: "Story with no link", url: null, source: { name: "Daily Gazette" } },
          { title: "Town fair crowned a 900-pound pumpkin champion", url: "https://example.test/3", source: null },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await fetchNewsAPI();
    expect(fetchMock).toHaveBeenCalledTimes(4); // one request per category
    expect(fetchMock.mock.calls[0][0]).toContain("apiKey=test-key");
    expect(out).toEqual([
      { headline: "Ferry captain rescued stranded swan from harbor", source_url: "https://example.test/1", source_name: "Daily Gazette" },
      { headline: "Town fair crowned a 900-pound pumpkin champion", source_url: "https://example.test/3", source_name: "NewsAPI" },
    ]);
  });
});

describe("fetchReddit", () => {
  it("drops NSFW and stickied posts and falls back to the permalink when a post has no URL", async () => {
    vi.stubEnv("REDDIT_USER_AGENT", "test-agent/1.0");
    const fetchMock = vi.fn(async (url: string) =>
      url.includes("/r/nottheonion/")
        ? json({
            data: {
              children: [
                { data: { title: " Mayor declared official town sandwich ", url: "https://example.test/a" } },
                { data: { title: "Adults only", url: "https://example.test/b", over_18: true } },
                { data: { title: "Weekly discussion thread", stickied: true } },
                { data: { title: "Self post", permalink: "/r/nottheonion/comments/xyz" } },
              ],
            },
          })
        : json({}, 429),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await fetchReddit();
    expect((fetchMock.mock.calls[0] as unknown[])[1]).toMatchObject({ headers: { "User-Agent": "test-agent/1.0" } });
    expect(out).toEqual([
      { headline: "Mayor declared official town sandwich", source_url: "https://example.test/a", source_name: "r/nottheonion" },
      { headline: "Self post", source_url: "https://www.reddit.com/r/nottheonion/comments/xyz", source_name: "r/nottheonion" },
    ]);
  });
});

describe("fetchGoogleNews", () => {
  it("splits 'Headline - Source' on the last separator, skips untitled items and caps each query at 25", async () => {
    parseURL.mockImplementation(async (url: string) => {
      if (url.includes("woman")) throw new Error("feed down");
      return {
        items: [
          { title: "Florida man - and his parrot - won local spelling bee - Gulf Coast Times", link: "https://example.test/1" },
          { title: "Headline with no source suffix at all", link: "https://example.test/2" },
          { link: "https://example.test/untitled" },
          ...Array.from({ length: 30 }, (_, i) => ({ title: `Filler ${i} - Wire`, link: `https://example.test/f${i}` })),
        ],
      };
    });

    const out = await fetchGoogleNews();
    expect(parseURL).toHaveBeenCalledTimes(2);
    expect(out[0]).toEqual({ headline: "Florida man - and his parrot - won local spelling bee", source_url: "https://example.test/1", source_name: "Gulf Coast Times" });
    expect(out[1]).toEqual({ headline: "Headline with no source suffix at all", source_url: "https://example.test/2", source_name: "Google News" });
    expect(out).toHaveLength(24); // 25 items taken, one had no title; the failing query added nothing
  });
});

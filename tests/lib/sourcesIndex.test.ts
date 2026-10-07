import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sources/newsapi", () => ({ fetchNewsAPI: async () => [{ headline: "n", source_url: "u", source_name: "s" }] }));
vi.mock("@/lib/sources/reddit", () => ({ fetchReddit: async () => { throw new Error("reddit down"); } }));
vi.mock("@/lib/sources/rss", () => ({ fetchRSSFeeds: async () => [] }));
vi.mock("@/lib/sources/googleNews", () => ({
  fetchGoogleNews: async () => [
    { headline: "g1", source_url: "u", source_name: "s" },
    { headline: "g2", source_url: "u", source_name: "s" },
  ],
}));

import { fetchAllRealHeadlines } from "@/lib/sources";

describe("fetchAllRealHeadlines", () => {
  it("combines every source and records a failing source as zero instead of failing the run", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { headlines, stats } = await fetchAllRealHeadlines();
    expect(headlines.map((h) => h.headline)).toEqual(["n", "g1", "g2"]);
    expect(stats).toEqual({ total: 3, bySource: { newsapi: 1, reddit: 0, rss: 0, googlenews: 2 } });
  });
});

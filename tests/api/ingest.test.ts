import { describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  fetchAllRealHeadlines: vi.fn(),
  insertRealHeadlines: vi.fn(async (rows: unknown[]) => rows.length),
  insertFakeHeadlines: vi.fn(async (rows: unknown[]) => rows.length),
  insertBonusSet: vi.fn(async () => true),
  insertBlankRounds: vi.fn(async (rows: unknown[]) => rows.length),
  pruneOldHeadlines: vi.fn(async () => 3),
  generateFakes: vi.fn(),
  generateBonusSet: vi.fn(),
  generateBlankRounds: vi.fn(),
}));
vi.mock("@/lib/sources", () => ({ fetchAllRealHeadlines: m.fetchAllRealHeadlines }));
vi.mock("@/lib/ingestion/insert", () => ({
  insertRealHeadlines: m.insertRealHeadlines,
  insertFakeHeadlines: m.insertFakeHeadlines,
  insertBonusSet: m.insertBonusSet,
  insertBlankRounds: m.insertBlankRounds,
  pruneOldHeadlines: m.pruneOldHeadlines,
}));
vi.mock("@/lib/headlines/claude", () => ({
  generateFakes: m.generateFakes,
  generateBonusSet: m.generateBonusSet,
  generateBlankRounds: m.generateBlankRounds,
}));

import { POST } from "@/app/api/cron/ingest-headlines/route";

const req = (headers: Record<string, string> = {}, query = "") =>
  new Request(`http://localhost/api/cron/ingest-headlines${query}`, { method: "POST", headers });

const REALS = [
  { headline: "Zoo penguin escapes enclosure and rides city bus to the aquarium", source_url: "https://example.test/1", source_name: "Daily Gazette" },
  { headline: "Ohio farmer discovered 40-pound pumpkin growing inside abandoned school bus", source_url: "https://example.test/2", source_name: "Farm Weekly" },
  // dropped by the quality filter before anything is inserted
  { headline: "You won't believe what this Ohio farmer discovered in his barn", source_url: "https://example.test/3", source_name: "Clickbait Daily" },
];

describe("cron ingest-headlines", () => {
  it("refuses every request when CRON_SECRET is unset, and wrong secrets when it is set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await POST(req({ authorization: "Bearer " }))).status).toBe(401);
    expect((await POST(req({}, "?secret="))).status).toBe(401);

    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await POST(req({ authorization: "Bearer wrong" }))).status).toBe(401);
    expect(m.fetchAllRealHeadlines).not.toHaveBeenCalled();
  });

  it("filters reals, generates content, and drops blank rounds pointing at a headline that doesn't exist", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.fetchAllRealHeadlines.mockResolvedValue({ headlines: REALS, stats: { total: 3, bySource: { rss: 3 } } });
    m.generateFakes.mockImplementation(async (_refs: string[], _n: number, tone: string) =>
      tone === "edgy" ? Promise.reject(new Error("rate limited")) : [{ headline: "Fake", reveal_text: "r", tone }],
    );
    m.generateBonusSet.mockResolvedValueOnce({ subject: "Penguins", fakes: [] }).mockResolvedValueOnce(null);
    m.generateBlankRounds.mockResolvedValue([
      { fromIndex: 1, template: "_____ discovered a pumpkin", answer: "Ohio farmer", distractors: ["a", "b"], reveal_text: "r" },
      { fromIndex: 9, template: "t", answer: "x", distractors: ["a", "b"], reveal_text: "r" },
    ]);

    const res = await POST(req({ authorization: "Bearer s3cret" }));
    const { ok, summary } = await res.json();

    expect(ok).toBe(true);
    expect(m.insertRealHeadlines.mock.calls[0][0]).toHaveLength(2);
    expect(summary).toMatchObject({
      fetched: 3, dedupedRaw: 2, realsInserted: 2,
      plausibleFakesGenerated: 1, edgyFakesGenerated: 0, fakesInserted: 1, // a failed tone doesn't sink the run
      bonusSetsAttempted: 2, bonusSetsInserted: 1,
      blanksGenerated: 2, blanksInserted: 1, pruned: 3,
    });
    expect(m.insertBlankRounds.mock.calls[0][0]).toEqual([
      expect.objectContaining({ originalHeadline: REALS[1].headline, source_url: REALS[1].source_url, source_name: "Farm Weekly" }),
    ]);
  });
});

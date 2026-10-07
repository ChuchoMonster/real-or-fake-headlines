import { describe, expect, it, vi } from "vitest";

const { fetchRoundsFromPool } = vi.hoisted(() => ({ fetchRoundsFromPool: vi.fn() }));
vi.mock("@/lib/pool/read", () => ({ fetchRoundsFromPool }));

import { GET } from "@/app/api/headlines/route";
import { mockBonusRounds, mockNormalRounds } from "@/lib/headlines/mockData";
import type { HeadlinesResponse } from "@/lib/types";

describe("GET /api/headlines", () => {
  it("serves the rounds built from the pool", async () => {
    const rounds = [{ kind: "normal", id: "p1", headline: "h", isReal: true, revealText: "r" }];
    fetchRoundsFromPool.mockResolvedValue({ rounds, source: "pool" });
    await expect((await GET()).json()).resolves.toEqual({ rounds });
  });

  it.each([
    ["the pool is empty", () => fetchRoundsFromPool.mockResolvedValue({ rounds: [], source: "empty" })],
    ["reading the pool throws", () => fetchRoundsFromPool.mockRejectedValue(new Error("db down"))],
  ])("falls back to the built-in rounds when %s, so the game stays playable", async (_label, arrange) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    arrange();
    const res = await GET();
    expect(res.status).toBe(200);
    const { rounds } = (await res.json()) as HeadlinesResponse;
    expect(rounds).toHaveLength(mockNormalRounds.length + mockBonusRounds.length);
    expect(new Set(rounds.map((r) => r.id))).toEqual(new Set([...mockNormalRounds, ...mockBonusRounds].map((r) => r.id)));
  });
});

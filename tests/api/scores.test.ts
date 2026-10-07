import { describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeUser, type Resolver } from "../helpers/fakeSupabase";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { GET, POST } from "@/app/api/scores/route";
import { POINTS_BONUS } from "@/lib/types";

const TOP = [
  { user_id: "u1", score: 120, streak: 18, created_at: "2026-01-02T00:00:00Z" },
  { user_id: "u2", score: 90, streak: 14, created_at: "2026-01-03T00:00:00Z" },
];

function setup(user: FakeUser = null, resolve?: Resolver) {
  const client = fakeSupabase({
    user,
    resolve:
      resolve ??
      ((table, calls) => {
        if (table === "profiles") return { data: [{ user_id: "u1", display_name: "PennyLane" }] };
        if (calls.some(([m]) => m === "insert")) return { error: null };
        if (calls.some(([m]) => m === "gt")) return { count: 6 };
        if (calls.some(([m, a]) => m === "eq" && a[0] === "user_id")) return { data: [{ score: 55, created_at: "2026-01-04T00:00:00Z" }] };
        return { data: TOP };
      }),
  });
  createClient.mockResolvedValue(client);
  return client;
}

const post = (body: unknown) =>
  new Request("http://localhost/api/scores", { method: "POST", body: JSON.stringify(body) });

describe("GET /api/scores", () => {
  it("returns the top scores with display names, using ??? for players without a profile", async () => {
    setup();
    const res = await GET(new Request("http://localhost/api/scores"));
    const body = await res.json();
    expect(body.scores.map((s: { display_name: string }) => s.display_name)).toEqual(["PennyLane", "???"]);
    expect(body).toMatchObject({ userRank: null, userBest: null });
  });

  it("limits 'day' to the last 24 hours and treats an unknown period as all-time", async () => {
    const day = setup();
    await GET(new Request("http://localhost/api/scores?period=day"));
    const since = day.queries[0].arg("gte", 1) as string;
    expect(day.queries[0].arg("gte")).toBe("created_at");
    expect(Date.now() - Date.parse(since)).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 5000);
    expect(Date.now() - Date.parse(since)).toBeLessThan(24 * 60 * 60 * 1000 + 5000);

    const bogus = setup();
    await GET(new Request("http://localhost/api/scores?period=century"));
    expect(bogus.queries[0].calls.some(([m]) => m === "gte")).toBe(false);
  });

  it("ranks a signed-in player as one plus the number of strictly higher scores", async () => {
    setup({ id: "u3" });
    const body = await (await GET(new Request("http://localhost/api/scores"))).json();
    expect(body).toMatchObject({ userBest: 55, userRank: 7 });
  });
});

describe("POST /api/scores", () => {
  it("requires a signed-in player", async () => {
    setup(null);
    expect((await POST(post({ score: 5, streak: 1, roundsPlayed: 1 }))).status).toBe(401);
  });

  it("rejects a payload with missing or non-numeric fields", async () => {
    const client = setup({ id: "u3" });
    expect((await POST(post({ score: "5", streak: 1, roundsPlayed: 1 }))).status).toBe(400);
    expect((await POST(post({ score: 5, streak: 1 }))).status).toBe(400);
    expect(client.queries).toHaveLength(0);
  });

  it("accepts the best possible run (every round a bonus) but rejects a single point more", async () => {
    const ok = setup({ id: "u3" });
    expect((await POST(post({ score: 12 * POINTS_BONUS, streak: 12, roundsPlayed: 12 }))).status).toBe(200);
    expect(ok.queries[0].arg("insert")).toEqual({ user_id: "u3", score: 120, streak: 12 });

    const cheat = setup({ id: "u3" });
    const res = await POST(post({ score: 121, streak: 12, roundsPlayed: 12 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/exceeds max possible 120/);
    expect(cheat.queries).toHaveLength(0);
  });

  it("floors fractional values and clamps negatives to zero before saving", async () => {
    const client = setup({ id: "u3" });
    await POST(post({ score: 14.9, streak: -3, roundsPlayed: 2.7 }));
    expect(client.queries[0].arg("insert")).toEqual({ user_id: "u3", score: 14, streak: 0 });
  });
});

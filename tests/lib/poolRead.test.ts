import { beforeEach, describe, expect, it, vi } from "vitest";
import { eqValue, fakeSupabase, type FakeUser } from "../helpers/fakeSupabase";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { cleanHeadline, fetchRoundsFromPool } from "@/lib/pool/read";
import type { BlankRound, BonusRound, NormalRound } from "@/lib/types";

type Row = {
  id: string;
  kind: "normal" | "bonus" | "blank";
  is_real: boolean;
  headline: string;
  source_url: string | null;
  source_name: string | null;
  reveal_text: string;
  subject: string | null;
  bonus_group: string | null;
  blank_template: string | null;
  blank_answer: string | null;
  blank_distractors: string[] | null;
};

const PLACES = ["Ohio", "Utah", "Maine", "Idaho", "Texas", "Iowa", "Kansas", "Oregon", "Nevada", "Alaska", "Vermont", "Montana"];

function row(id: string, kind: Row["kind"], is_real: boolean, headline: string, extra: Partial<Row> = {}): Row {
  return {
    id, kind, is_real, headline,
    source_url: is_real ? `https://example.test/${id}` : null,
    source_name: is_real ? "Daily Gazette" : null,
    reveal_text: "test", subject: null, bonus_group: null,
    blank_template: null, blank_answer: null, blank_distractors: null,
    ...extra,
  };
}

const normal = (id: string, isReal: boolean, place: string) =>
  row(id, "normal", isReal, `${place} librarian discovered a lost manuscript inside a donated sofa`);

function pool({ reals = 10, fakes = 10, floridaReals = 0 } = {}): Row[] {
  return [
    ...Array.from({ length: reals }, (_, i) => normal(`r${i}`, true, PLACES[i % PLACES.length])),
    ...Array.from({ length: fakes }, (_, i) => normal(`f${i}`, false, PLACES[i % PLACES.length])),
    ...Array.from({ length: floridaReals }, (_, i) => normal(`fl${i}`, true, "Florida")),
    // low quality: clickbait, must never reach a player
    row("junk", "normal", true, "You won't believe what this Ohio farmer discovered in his barn"),
    // bonus groups: g1 well-formed; g2 has two "real" rows; g3 is missing a fake
    ...["a", "b", "c"].map((s, i) => row(`g1${s}`, "bonus", i === 0, `Aquarium octopus escaped through drainpipe again, take ${s}`, { bonus_group: "g1", subject: "Octopus" })),
    ...["a", "b", "c"].map((s, i) => row(`g2${s}`, "bonus", i < 2, `Museum goose escaped through gift shop again, take ${s}`, { bonus_group: "g2", subject: "Goose" })),
    ...["a", "b"].map((s, i) => row(`g3${s}`, "bonus", i === 0, `Circus llama escaped through ticket booth again, take ${s}`, { bonus_group: "g3", subject: "Llama" })),
    // blank rounds: one valid, one with only a single distractor
    row("blank-ok", "blank", true, "Pat Example adopted a three-legged goat named Biscuit", {
      blank_template: "_____ adopted a three-legged goat named Biscuit", blank_answer: "Pat Example", blank_distractors: ["Sam Sample", "Alex Placeholder"],
    }),
    row("blank-bad", "blank", true, "Sam Sample donated a vintage tractor to the town museum", {
      blank_template: "_____ donated a vintage tractor to the town museum", blank_answer: "Sam Sample", blank_distractors: ["Pat Example"],
    }),
  ];
}

function setup(rows: Row[], user: FakeUser = null, seen: string[] = []) {
  const client = fakeSupabase({
    user,
    resolve: (table, calls) =>
      table === "headlines"
        ? { data: rows.filter((r) => r.kind === eqValue(calls, "kind")) }
        : { data: seen.map((headline_id) => ({ headline_id })) },
  });
  const admin = fakeSupabase();
  mocks.createClient.mockResolvedValue(client);
  mocks.createAdminClient.mockReturnValue(admin);
  return { client, admin };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("cleanHeadline", () => {
  it("strips a trailing publication name or domain", () => {
    const h = "Zoo penguin escapes enclosure and rides city bus to the aquarium";
    expect(cleanHeadline(`${h} - Springfield Daily Gazette`)).toBe(h);
    expect(cleanHeadline(`${h} | example.com`)).toBe(h);
    // hyphens inside the headline itself are left alone
    const hyphenated = "Man sues airline over 8-inch legroom on cross-country flight";
    expect(cleanHeadline(hyphenated)).toBe(hyphenated);
  });

  it("keeps the suffix when stripping it would leave a stub", () => {
    expect(cleanHeadline("Mayor resigned on Tuesday - Springfield Daily Gazette")).toBe(
      "Mayor resigned on Tuesday - Springfield Daily Gazette",
    );
  });

});

describe("fetchRoundsFromPool", () => {
  it("returns an empty result when there are no normal headlines", async () => {
    setup([]);
    await expect(fetchRoundsFromPool()).resolves.toEqual({ rounds: [], source: "empty" });
  });

  it("builds 8 normals split 4 real / 4 fake, plus only well-formed bonus and blank rounds", async () => {
    const { admin } = setup(pool());
    const { rounds, source } = await fetchRoundsFromPool();
    expect(source).toBe("pool");

    const ns = rounds.filter((r): r is NormalRound => r.kind === "normal");
    expect(ns).toHaveLength(8);
    expect(ns.filter((r) => r.isReal)).toHaveLength(4);
    expect(rounds.map((r) => r.id)).not.toContain("junk");

    const bs = rounds.filter((r): r is BonusRound => r.kind === "bonus");
    expect(bs.map((b) => b.id)).toEqual(["g1"]);
    expect(bs[0].choices.filter((c) => c.isReal)).toHaveLength(1);
    expect(bs[0].subject).toBe("Octopus");

    const ks = rounds.filter((r): r is BlankRound => r.kind === "blank");
    expect(ks.map((k) => k.id)).toEqual(["blank-ok"]);
    expect([...ks[0].choices].sort()).toEqual(["Alex Placeholder", "Pat Example", "Sam Sample"]);

    // anonymous players have nothing recorded as seen
    expect(admin.queries).toHaveLength(0);
  });

  it("caps Florida headlines at one per real/fake group", async () => {
    for (let run = 0; run < 20; run++) {
      setup(pool({ reals: 6, fakes: 6, floridaReals: 4 }));
      const { rounds } = await fetchRoundsFromPool();
      const florida = rounds.filter((r) => r.kind === "normal" && /florida/i.test(r.headline));
      expect(florida.length).toBeLessThanOrEqual(1);
    }
  });

  it("skips headlines a signed-in player has already seen, then records the new ones", async () => {
    const seen = ["r0", "r1", "r2", "r3", "r4", "f0"];
    const { admin } = setup(pool(), { id: "user-1" }, seen);
    const { rounds } = await fetchRoundsFromPool();

    expect(rounds.map((r) => r.id).filter((id) => seen.includes(id))).toEqual([]);

    const upsert = admin.queries.find((q) => q.table === "user_seen_headlines")!;
    const recorded = (upsert.arg("upsert") as { user_id: string; headline_id: string }[]).map((r) => r.headline_id);
    const expected = rounds.flatMap((r) => (r.kind === "bonus" ? r.choices.map((c) => c.id) : [r.id]));
    expect(new Set(recorded)).toEqual(new Set(expected));
    expect(upsert.arg("upsert", 1)).toEqual({ onConflict: "user_id,headline_id", ignoreDuplicates: true });
  });

  it("falls back to the full pool when too few unseen reals remain", async () => {
    const seen = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"]; // only 2 unseen reals left
    setup(pool(), { id: "user-1" }, seen);
    const { rounds } = await fetchRoundsFromPool();
    const reals = rounds.filter((r) => r.kind === "normal" && r.isReal);
    expect(reals).toHaveLength(4);
  });
});

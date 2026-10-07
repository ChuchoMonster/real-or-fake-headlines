import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../helpers/fakeSupabase";

const { createAdminClient } = vi.hoisted(() => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

import { insertBonusSet, insertFakeHeadlines, insertRealHeadlines } from "@/lib/ingestion/insert";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("insertFakeHeadlines", () => {
  it("rejects fakes over 15 words server-side, since Claude sometimes ignores the cap", async () => {
    const admin = fakeSupabase();
    createAdminClient.mockReturnValue(admin);
    const fifteen = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen";
    const n = await insertFakeHeadlines([
      { headline: fifteen, reveal_text: "r", tone: "plausible" },
      { headline: `${fifteen} sixteen`, reveal_text: "r", tone: "edgy" },
    ]);
    expect(n).toBe(1);
    expect(admin.queries.map((q) => (q.arg("insert") as { headline: string }).headline)).toEqual([fifteen]);
    expect(admin.queries[0].arg("insert")).toMatchObject({ kind: "normal", is_real: false, tone: "plausible" });
  });
});

describe("insertRealHeadlines", () => {
  it("counts only new rows and treats a duplicate (23505) as expected, not as an error", async () => {
    const results = [null, { message: "duplicate", code: "23505" }, { message: "boom", code: "XX000" }];
    let i = 0;
    createAdminClient.mockReturnValue(fakeSupabase({ resolve: () => ({ error: results[i++] }) }));
    const raw = (h: string) => ({ headline: h, source_url: "https://example.test", source_name: "Daily Gazette" });

    await expect(insertRealHeadlines([raw("a"), raw("b"), raw("c")])).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("[insertRealHeadlines]", "boom");
  });
});

describe("insertBonusSet", () => {
  it("refuses a set with fewer than two fakes without touching the database", async () => {
    await expect(insertBonusSet({ subject: "S", real: { headline: "h", source_url: "u", source_name: "n", reveal_text: "r" }, fakes: [{ headline: "f", reveal_text: "r" }] })).resolves.toBe(false);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("writes one real and exactly two fakes sharing one bonus_group", async () => {
    const admin = fakeSupabase();
    createAdminClient.mockReturnValue(admin);
    const ok = await insertBonusSet({
      subject: "Octopus Antics",
      real: { headline: "Real one", source_url: "https://example.test", source_name: "Daily Gazette", reveal_text: "Real." },
      fakes: ["Fake one", "Fake two", "Fake three"].map((headline) => ({ headline, reveal_text: "Fake." })),
    });
    expect(ok).toBe(true);
    const rows = admin.queries[0].arg("insert") as { headline: string; is_real: boolean; bonus_group: string; kind: string; subject: string }[];
    expect(rows.map((r) => [r.headline, r.is_real])).toEqual([["Real one", true], ["Fake one", false], ["Fake two", false]]);
    expect(new Set(rows.map((r) => r.bonus_group)).size).toBe(1);
    expect(rows.every((r) => r.kind === "bonus" && r.subject === "Octopus Antics")).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeUser } from "../helpers/fakeSupabase";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { POST } from "@/app/api/answer/route";

const ID = "3f2b8c1e-9a4d-4e7f-b6a2-1c0d9e8f7a6b";
const post = (body: string) => new Request("http://localhost/api/answer", { method: "POST", body });

function setup(user: FakeUser, insertError: { message: string } | null = null) {
  const admin = fakeSupabase({ resolve: () => ({ error: insertError }) });
  mocks.createClient.mockResolvedValue(fakeSupabase({ user }));
  mocks.createAdminClient.mockReturnValue(admin);
  return admin;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/answer", () => {
  it("returns 400 for malformed JSON or an invalid payload, without writing anything", async () => {
    const admin = setup(null);
    const bad = [
      "{not json",
      JSON.stringify({ headline_id: "m1", was_correct: true, round_kind: "normal" }), // not a UUID
      JSON.stringify({ headline_id: ID, was_correct: "yes", round_kind: "normal" }),
      JSON.stringify({ headline_id: ID, was_correct: true, round_kind: "lightning" }),
    ];
    const statuses = await Promise.all(bad.map(async (b) => (await POST(post(b))).status));
    expect(statuses).toEqual([400, 400, 400, 400]);
    expect(admin.queries).toHaveLength(0);
  });

  it("logs the answer, attributed to the player when signed in and anonymous otherwise", async () => {
    const body = JSON.stringify({ headline_id: ID, was_correct: false, round_kind: "bonus" });

    const signedIn = setup({ id: "user-1" });
    expect((await POST(post(body))).status).toBe(200);
    expect(signedIn.queries[0].table).toBe("headline_answers");
    expect(signedIn.queries[0].arg("insert")).toEqual({ headline_id: ID, user_id: "user-1", was_correct: false, round_kind: "bonus" });

    const anonymous = setup(null);
    expect((await POST(post(body))).status).toBe(200);
    expect(anonymous.queries[0].arg("insert")).toMatchObject({ user_id: null });
  });

  it("returns 500 when the insert fails", async () => {
    setup(null, { message: "db down" });
    const res = await POST(post(JSON.stringify({ headline_id: ID, was_correct: true, round_kind: "blank" })));
    expect(res.status).toBe(500);
  });
});

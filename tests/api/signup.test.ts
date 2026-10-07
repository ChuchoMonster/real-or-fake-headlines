import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../helpers/fakeSupabase";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), createAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { POST } from "@/app/api/auth/signup/route";

const signup = (body: unknown) =>
  new Request("http://localhost/api/auth/signup", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/auth/signup", () => {
  it("rejects missing fields, short passwords and invalid names before creating anything", async () => {
    const cases: [unknown, RegExp][] = [
      [{ email: "pat@example.test", password: "hunter22" }, /Missing fields/],
      [{ email: "pat@example.test", password: "12345", displayName: "PennyLane" }, /at least 6/],
      [{ email: "pat@example.test", password: "hunter22", displayName: "Admin" }, /reserved/],
    ];
    for (const [body, error] of cases) {
      const res = await POST(signup(body));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(error);
    }
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects a display name that is already taken without creating an auth user", async () => {
    const admin = fakeSupabase({ resolve: () => ({ data: { user_id: "someone-else" } }) });
    const createUser = vi.fn();
    mocks.createAdminClient.mockReturnValue({ ...admin, auth: { admin: { createUser } } });

    const res = await POST(signup({ email: "pat@example.test", password: "hunter22", displayName: " PennyLane " }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/taken/);
    expect(admin.queries[0].has("eq", "display_name", "PennyLane")).toBe(true);
    expect(createUser).not.toHaveBeenCalled();
  });
});

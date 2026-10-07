import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnswerPayload = {
  headline_id?: string;
  was_correct?: boolean;
  round_kind?: "normal" | "bonus" | "blank";
};

function isUuid(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

export async function POST(request: Request) {
  let data: AnswerPayload;
  try {
    data = (await request.json()) as AnswerPayload;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (
    !isUuid(data.headline_id) ||
    typeof data.was_correct !== "boolean" ||
    !["normal", "bonus", "blank"].includes(data.round_kind ?? "")
  ) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  // Attribute the answer to the user if they're signed in; anonymous is fine.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Session helper may throw for proxy cookies in dev — non-fatal.
  }

  const admin = createAdminClient();
  const { error } = await admin.from("headline_answers").insert({
    headline_id: data.headline_id,
    user_id: userId,
    was_correct: data.was_correct,
    round_kind: data.round_kind,
  });

  if (error) {
    console.error("[api/answer]", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}

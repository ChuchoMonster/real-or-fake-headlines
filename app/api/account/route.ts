import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Dev-mode account deletion.
//
// Deletes the user's profile and scores via RLS. The auth.users row is
// *not* deleted here — that requires the Supabase service role key, which
// we'll add as part of the pre-launch pass. An orphaned auth row left
// behind is harmless: there's no profile, so the user can't appear
// anywhere in the app, and signing in again with the same email would
// land them in /onboarding as a fresh-looking user.
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "not signed in" }, { status: 401 });
  }

  const scoreRes = await supabase.from("scores").delete().eq("user_id", user.id);
  if (scoreRes.error) {
    return Response.json({ error: scoreRes.error.message }, { status: 500 });
  }

  const profileRes = await supabase
    .from("profiles")
    .delete()
    .eq("user_id", user.id);
  if (profileRes.error) {
    return Response.json({ error: profileRes.error.message }, { status: 500 });
  }

  await supabase.auth.signOut();
  return Response.json({ ok: true });
}

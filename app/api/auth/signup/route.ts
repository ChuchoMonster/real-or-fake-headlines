import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateDisplayName } from "@/lib/auth/validateDisplayName";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!body.email || !body.password || !body.displayName) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  if (body.password.length < 6) {
    return Response.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const check = validateDisplayName(body.displayName);
  if (!check.ok) {
    return Response.json({ error: check.reason }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check if display name is taken
  const { data: existing } = await admin
    .from("profiles")
    .select("user_id")
    .eq("display_name", check.value)
    .maybeSingle();
  if (existing) {
    return Response.json(
      { error: "That display name is taken. Try another." },
      { status: 400 }
    );
  }

  // Create the auth user
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email: body.email.trim(),
    password: body.password,
    email_confirm: true,
    user_metadata: { display_name: check.value },
  });

  if (userErr) {
    if (userErr.message.includes("already been registered")) {
      return Response.json(
        { error: "An account with this email already exists. Use Sign In." },
        { status: 400 }
      );
    }
    return Response.json({ error: userErr.message }, { status: 400 });
  }

  // Create the profile (admin bypasses RLS)
  const { error: profileErr } = await admin.from("profiles").insert({
    user_id: userData.user.id,
    display_name: check.value,
  });

  if (profileErr) {
    return Response.json({ error: profileErr.message }, { status: 500 });
  }

  // Now sign the user in via the server client so session cookies get set
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: body.email.trim(),
    password: body.password,
  });

  if (signInErr) {
    return Response.json({ error: signInErr.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

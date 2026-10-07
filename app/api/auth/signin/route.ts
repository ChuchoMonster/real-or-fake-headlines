import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: body.email.trim(),
    password: body.password,
  });

  if (error) {
    if (error.message === "Invalid login credentials") {
      return Response.json(
        { error: "Wrong email or password." },
        { status: 400 }
      );
    }
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}

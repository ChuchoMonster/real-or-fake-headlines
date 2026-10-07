import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/";

  const supabase = await createClient();

  // Handle PKCE flow (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error.message)}`, url.origin)
      );
    }
  }
  // Handle magic link / OTP flow (token_hash + type)
  else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "magiclink",
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(error.message)}`, url.origin)
      );
    }
  } else {
    return NextResponse.redirect(new URL("/?error=missing_auth_params", url.origin));
  }

  // Check/create profile for the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      const displayName =
        (user.user_metadata?.display_name as string | undefined)?.trim() ?? "";

      if (displayName.length >= 3 && displayName.length <= 20) {
        const { error: insertErr } = await supabase
          .from("profiles")
          .insert({ user_id: user.id, display_name: displayName });

        if (insertErr) {
          return NextResponse.redirect(new URL("/onboarding", url.origin));
        }
      } else {
        return NextResponse.redirect(new URL("/onboarding", url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

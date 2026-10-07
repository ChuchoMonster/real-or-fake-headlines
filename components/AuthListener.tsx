"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles implicit-flow auth redirects. When a magic link redirects to the
 * app with an access token in the URL hash, the Supabase client picks it up
 * automatically. This component listens for the SIGNED_IN event and:
 * 1. Checks if a profile exists
 * 2. If not, creates one from user_metadata (display name set during sign-up)
 * 3. Refreshes the page so the server-rendered components see the session
 */
export default function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const user = session.user;

        // Check if profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile) {
          // First-time user — create profile from metadata
          const displayName =
            (user.user_metadata?.display_name as string | undefined)?.trim() ??
            "";

          if (displayName.length >= 3 && displayName.length <= 20) {
            await supabase
              .from("profiles")
              .insert({ user_id: user.id, display_name: displayName });
          } else {
            // No valid display name — redirect to onboarding
            router.replace("/onboarding");
            return;
          }
        }

        // Refresh the page so server components pick up the session
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}

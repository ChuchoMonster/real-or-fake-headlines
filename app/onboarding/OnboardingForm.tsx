"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateDisplayName } from "@/lib/auth/validateDisplayName";

export default function OnboardingForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const check = validateDisplayName(name);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .insert({ user_id: user.id, display_name: check.value });
      if (error) {
        setError(
          error.code === "23505"
            ? "That name's taken. Try another."
            : error.message
        );
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <input
        required
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        placeholder="streakmaster"
        className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-lg font-bold outline-none focus:border-amber-400"
      />
      <button
        type="submit"
        disabled={pending || name.trim().length < 3}
        className="rounded-full bg-amber-400 px-8 py-3 text-base font-black uppercase tracking-wider text-neutral-950 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save & play"}
      </button>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </form>
  );
}

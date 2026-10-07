"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/sign-in?sent=1");
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <label className="font-serif text-xs font-bold uppercase tracking-widest text-neutral-600">
        Email
      </label>
      <input
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="border border-neutral-500 bg-white px-4 py-3 font-serif text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
      />
      <button
        type="submit"
        disabled={pending || !email}
        className="bg-neutral-900 px-8 py-3 font-serif text-base font-black uppercase tracking-wider text-white transition-all hover:bg-neutral-800 active:scale-[0.97] disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send magic link"}
      </button>
      {error && <p className="font-serif text-sm text-red-700">{error}</p>}
    </form>
  );
}

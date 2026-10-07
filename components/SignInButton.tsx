"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  displayName?: string | null;
  variant?: "floating" | "cta";
  label?: string;
};

export default function SignInButton({
  displayName,
  variant = "floating",
  label = "Sign in",
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  async function signOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.refresh();
    setPending(false);
  }

  // Signed in → profile chip with a dropdown
  if (displayName) {
    return (
      <div ref={rootRef} className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-neutral-200 backdrop-blur hover:border-amber-400"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {displayName}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-10 min-w-[160px] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 text-sm shadow-2xl">
            <Link
              href="/settings"
              className="block px-4 py-2.5 text-neutral-300 hover:bg-neutral-900"
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </Link>
            <button
              onClick={signOut}
              disabled={pending}
              className="block w-full border-t border-neutral-900 px-4 py-2.5 text-left text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
            >
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Signed out → link to sign-in page
  const className =
    variant === "cta"
      ? "rounded-full bg-amber-400 px-8 py-3 text-base font-black uppercase tracking-wider text-neutral-950 transition-transform hover:scale-105 active:scale-95"
      : "rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-neutral-400 backdrop-blur transition-colors hover:border-amber-400 hover:text-amber-400";

  return (
    <Link href="/sign-in" className={className}>
      {label}
    </Link>
  );
}

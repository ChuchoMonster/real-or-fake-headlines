"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("App error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-400">
        Something broke
      </p>
      <h1 className="text-5xl font-black">Well, that's a first.</h1>
      <p className="text-sm text-neutral-400">
        The game ran into an unexpected error. Try again — if it keeps happening, let us know.
      </p>
      {error.digest && (
        <p className="text-xs text-neutral-600">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full bg-amber-400 px-8 py-3 text-sm font-black uppercase tracking-wider text-neutral-950 transition-transform hover:scale-105 active:scale-95"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-full border border-neutral-700 bg-neutral-900 px-8 py-3 text-sm font-bold uppercase tracking-wider text-neutral-200 transition-colors hover:border-amber-400"
        >
          Home
        </a>
      </div>
    </main>
  );
}

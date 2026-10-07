"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Round } from "@/lib/types";
import { randomTaunt } from "@/lib/taunts";
import ShareCard from "./ShareCard";
import SignInButton from "./SignInButton";

type Props = {
  score: number;
  streak: number;
  roundsPlayed: number;
  displayName: string | null;
  losingRound?: Round;
  pickedIdx?: number;
  onPlayAgain: () => void;
};

export default function GameOverScreen({
  score,
  streak,
  roundsPlayed,
  displayName,
  losingRound,
  onPlayAgain,
}: Props) {
  const submittedRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const taunt = useMemo(() => randomTaunt(), []);

  // Extract source URL and correct answer from the losing round for the card
  const losingRoundSourceUrl = useMemo(() => {
    if (!losingRound) return undefined;
    if (losingRound.kind === "normal") return losingRound.source;
    if (losingRound.kind === "blank") return losingRound.source;
    if (losingRound.kind === "bonus") {
      const real = losingRound.choices.find((c) => c.isReal);
      return real?.source;
    }
    return undefined;
  }, [losingRound]);

  const correctAnswer = useMemo(() => {
    if (!losingRound) return undefined;
    if (losingRound.kind === "blank") return losingRound.answer;
    if (losingRound.kind === "bonus") {
      const realIdx = losingRound.choices.findIndex((c) => c.isReal);
      const realChoice = losingRound.choices[realIdx];
      if (realChoice) {
        return `${String.fromCharCode(65 + realIdx)}. ${realChoice.headline}`;
      }
    }
    return undefined;
  }, [losingRound]);

  // Auto-save score for signed-in users
  useEffect(() => {
    if (!displayName) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    let cancelled = false;
    setState("saving");
    (async () => {
      try {
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score, streak, roundsPlayed }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        setState("saved");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Save failed");
        setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [displayName, score, streak, roundsPlayed]);

  return (
    <div
      className={`flex flex-1 flex-col items-center gap-4 px-6 pt-20 pb-6 ${
        losingRound ? "animate-flash-red" : ""
      }`}
    >
      {/* Game Over — big red header above the card */}
      <p className="text-6xl font-black uppercase tracking-tight text-red-600 sm:text-7xl">
        Game Over
      </p>

      {/* Score card */}
      <ShareCard
        ref={cardRef}
        score={score}
        taunt={losingRound ? taunt : undefined}
        sourceUrl={losingRoundSourceUrl}
        correctAnswer={correctAnswer}
      />

      {/* Save status — only show errors */}
      {displayName && state === "error" && (
        <p className="text-xs text-rose-400">{error}</p>
      )}

      {/* Badges */}
      {/* Play Again */}
      <button
        onClick={onPlayAgain}
        className="rounded-full bg-amber-400 px-12 py-4 text-xl font-black uppercase tracking-wider text-neutral-950 shadow-[0_0_0_0_rgba(251,191,36,0.6)] transition-all hover:scale-105 hover:shadow-[0_0_40px_0_rgba(251,191,36,0.6)] active:scale-95"
      >
        Play Again
      </button>

      {/* Sign-in CTA — compact, no subtext */}
      {!displayName && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-center">
          <p className="text-sm font-bold text-neutral-200">
            Sign in to save your score.
          </p>
          <SignInButton variant="cta" label="Sign in to save" />
        </div>
      )}
    </div>
  );
}



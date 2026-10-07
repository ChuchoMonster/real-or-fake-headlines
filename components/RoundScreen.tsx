"use client";

import { useEffect } from "react";
import type { NormalRound } from "@/lib/types";
import Newspaper from "./newspaper/Newspaper";
import SwipeableNewspaper from "./newspaper/SwipeableNewspaper";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

type Props = {
  round: NormalRound;
  onAnswer: (guessReal: boolean) => void;
};

export default function RoundScreen({ round, onAnswer }: Props) {
  const isMobile = useIsMobile();

  // Keyboard shortcuts for desktop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onAnswer(true);
      if (e.key === "ArrowRight") onAnswer(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onAnswer]);

  if (isMobile) {
    return (
      <div className="relative flex flex-1 flex-col items-center px-4 pb-4 pt-2 overflow-hidden">
        <SwipeableNewspaper
          headline={round.headline}
          styleKey={round.id}
          onAnswer={onAnswer}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-between gap-6 px-6 pb-8 pt-6">
      <div className="flex w-full flex-1 items-center justify-center">
        <Newspaper headline={round.headline} styleKey={round.id} />
      </div>
      <div className="grid w-full max-w-3xl grid-cols-2 gap-4 animate-post-spin-reveal">
        <button
          onClick={() => onAnswer(true)}
          className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 py-8 text-3xl font-black uppercase tracking-wider text-emerald-400 transition-all hover:scale-[1.02] hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-[0.98] sm:text-4xl"
        >
          Real
        </button>
        <button
          onClick={() => onAnswer(false)}
          className="rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 py-8 text-3xl font-black uppercase tracking-wider text-rose-400 transition-all hover:scale-[1.02] hover:border-rose-400 hover:bg-rose-500/20 active:scale-[0.98] sm:text-4xl"
        >
          Fake
        </button>
      </div>
    </div>
  );
}

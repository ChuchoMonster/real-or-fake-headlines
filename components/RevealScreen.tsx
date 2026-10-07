"use client";

import { useEffect, useState } from "react";
import type { Round } from "@/lib/types";
import { randomPraise, type Praise } from "@/lib/praise";

type Props = {
  round: Round;
  correct: true;
  onContinue: () => void;
};

// Brief green flash between rounds when the player gets one right.
// Normal rounds auto-advance after 900ms. Bonus/blank rounds hold an extra
// second and show a piece of praise so the player can read it.
export default function RevealScreen({ round, onContinue }: Props) {
  const isBonus = round.kind === "bonus" || round.kind === "blank";
  const [praise] = useState<Praise | null>(() =>
    isBonus ? randomPraise() : null
  );

  useEffect(() => {
    const delay = isBonus ? 1900 : 900;
    const t = setTimeout(onContinue, delay);
    return () => clearTimeout(t);
  }, [onContinue, isBonus]);

  // Only show label when they correctly spotted a fake
  let whatItWas = "";
  if (round.kind === "normal" && !round.isReal) {
    whatItWas = "That was fake — nice catch";
  }

  return (
    <div className="pointer-events-auto flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center animate-flash-green">
      <p className="text-6xl font-black uppercase tracking-tight text-emerald-400 sm:text-7xl">
        Correct!
      </p>
      {whatItWas && (
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-300/70">
          {whatItWas}
        </p>
      )}
      {isBonus && (
        <p className="text-lg font-bold uppercase tracking-widest text-amber-400">
          +10 Bonus Points
        </p>
      )}
      {praise && (
        <div className="flex max-w-md flex-col items-center gap-2">
          <span className="text-3xl leading-none sm:text-4xl">{praise.emoji}</span>
          <p className="text-lg font-bold italic text-emerald-200 sm:text-xl">
            &ldquo;{praise.line}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import type { BlankRound } from "@/lib/types";
import Newspaper from "./newspaper/Newspaper";

type Props = {
  round: BlankRound;
  onAnswer: (choiceIdx: number) => void;
};

export default function BlankRoundScreen({ round, onAnswer }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 px-6 pb-8 pt-4">
      <div className="rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-5 py-1.5 text-xs font-black uppercase tracking-[0.3em] text-neutral-950">
        ★ Bonus Round · +10 pts
      </div>
      <p className="text-center text-2xl font-black leading-tight tracking-tight sm:text-3xl">
        Fill in the <span className="text-amber-400">blank.</span>
      </p>

      <div className="flex w-full justify-center">
        <Newspaper headline={round.template} styleKey={round.id} />
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-3 animate-post-spin-reveal">
        {round.choices.map((name, i) => (
          <button
            key={i}
            onClick={() => onAnswer(i)}
            className="group rounded-2xl border-2 border-neutral-800 bg-neutral-900 p-5 text-left text-lg font-bold leading-snug transition-all hover:scale-[1.01] hover:border-amber-400 hover:bg-neutral-900/80 active:scale-[0.99] sm:text-xl"
          >
            <span className="mr-3 text-sm font-black text-neutral-600 group-hover:text-amber-400">
              {String.fromCharCode(65 + i)}.
            </span>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

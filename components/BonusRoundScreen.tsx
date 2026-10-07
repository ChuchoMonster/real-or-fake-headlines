"use client";

import type { BonusRound } from "@/lib/types";

type Props = {
  round: BonusRound;
  onAnswer: (choiceIdx: number) => void;
};

export default function BonusRoundScreen({ round, onAnswer }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-8 pt-4">
      <div className="mt-2 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-5 py-1.5 text-xs font-black uppercase tracking-[0.3em] text-neutral-950">
        ★ Bonus Round · +10 pts
      </div>

      <div className="my-auto flex w-full max-w-2xl flex-col items-center gap-6">
        <h2 className="text-center text-3xl font-black leading-tight tracking-tight sm:text-5xl sm:leading-[1.05]">
          One of these is real.
          <br />
          <span className="text-amber-400">Pick it.</span>
        </h2>

        <div className="flex w-full flex-col gap-3">
          {round.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => onAnswer(i)}
              className="group rounded-2xl border-2 border-neutral-800 bg-neutral-900 p-5 text-left text-lg font-bold leading-snug transition-all hover:scale-[1.01] hover:border-amber-400 hover:bg-neutral-900/80 active:scale-[0.99] sm:text-xl"
            >
              <span className="mr-3 text-sm font-black text-neutral-600 group-hover:text-amber-400">
                {String.fromCharCode(65 + i)}.
              </span>
              “{choice.headline}”
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

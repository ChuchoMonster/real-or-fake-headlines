"use client";

import { useEffect } from "react";

export type WrongKind = "fake-news" | "gotcha";

type Props = {
  kind: WrongKind;
  onContinue: () => void;
};

// Brief red flash screen shown immediately after a wrong answer, before
// transitioning to the full game-over screen.
// - "fake-news": player believed a fake headline was real. They fell for it.
// - "gotcha":    player distrusted a real headline / picked the wrong name.
export default function WrongScreen({ kind, onContinue }: Props) {
  useEffect(() => {
    const t = setTimeout(onContinue, 1100);
    return () => clearTimeout(t);
  }, [onContinue]);

  const label = kind === "fake-news" ? "Fake News" : "Nope. That actually happened.";

  return (
    <div className="pointer-events-auto flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center animate-flash-red animate-shake">
      <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-rose-400 text-7xl font-black text-rose-400 sm:h-36 sm:w-36 sm:text-8xl">
        ✗
      </div>
      <p className={`font-black tracking-tight text-rose-400 ${
        kind === "fake-news" ? "text-6xl uppercase sm:text-7xl" : "text-3xl sm:text-4xl"
      }`}>
        {label}
      </p>
    </div>
  );
}

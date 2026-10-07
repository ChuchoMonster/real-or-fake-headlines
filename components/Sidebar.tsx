"use client";

import type { LeaderboardEntry } from "@/app/api/scores/route";
import type { TopAllTime } from "@/lib/leaderboard/topAllTime";
import { useCollectedReals } from "@/lib/hooks/collectedReals";

type Props = {
  topAllTime: TopAllTime;
  personalBest: LeaderboardEntry[];
};

export default function Sidebar({ topAllTime, personalBest }: Props) {
  const { reals } = useCollectedReals();

  return (
    <>
      {/* LEFT sidebar — Leaderboard */}
      <aside className="pointer-events-auto fixed left-4 top-20 z-30 hidden max-h-[calc(100vh-6rem)] w-72 flex-col gap-3 overflow-y-auto xl:flex">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-500/80">
            Leaderboard
          </p>
          <div className="flex gap-3">
            {/* All Players */}
            <div className="flex-1">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
                All Players
              </p>
              {topAllTime.byPoints.length === 0 ? (
                <p className="py-1 text-[10px] text-neutral-600">No scores yet</p>
              ) : (
                <ol className="space-y-1">
                  {topAllTime.byPoints.map((e, i) => (
                    <li
                      key={`${e.display_name}-${e.created_at}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-4 font-bold text-neutral-600">{i + 1}</span>
                      <span className="flex-1 truncate font-bold text-neutral-300">
                        {e.display_name}
                      </span>
                      <span className="font-black tabular-nums text-emerald-400">
                        {e.score}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            {/* Personal Best */}
            <div className="flex-1 border-l border-neutral-800 pl-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
                Personal Best
              </p>
              {personalBest.length === 0 ? (
                <p className="py-1 text-[10px] text-neutral-600">Play to see yours</p>
              ) : (
                <ol className="space-y-1">
                  {personalBest.map((e, i) => (
                    <li
                      key={`pb-${e.created_at}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-4 font-bold text-neutral-600">{i + 1}</span>
                      <span className="font-black tabular-nums text-emerald-400">
                        {e.score}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT sidebar — Real Headlines */}
      <aside className="pointer-events-auto fixed right-4 top-20 z-30 hidden max-h-[calc(100vh-6rem)] w-96 flex-col gap-3 overflow-y-auto xl:flex">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 backdrop-blur">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-sky-400/80">
            Real Headlines
          </p>
          {reals.length === 0 ? (
            <p className="py-1 text-sm leading-relaxed text-neutral-600">
              Guess a real headline right and it&apos;ll appear here with a link
              to the source.
            </p>
          ) : (
            <ul className="space-y-3">
              {reals.map((r) => (
                <li key={r.id} className="text-sm leading-snug">
                  {r.source ? (
                    <a
                      href={r.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-300 underline decoration-neutral-700 underline-offset-2 hover:text-sky-300 hover:decoration-sky-500"
                    >
                      {r.headline}
                    </a>
                  ) : (
                    <span className="text-neutral-300">{r.headline}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

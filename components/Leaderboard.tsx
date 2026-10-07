import type { LeaderboardEntry } from "@/app/api/scores/route";

type Props = {
  scores: LeaderboardEntry[];
  highlightName?: string | null;
};

export default function Leaderboard({ scores, highlightName }: Props) {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-neutral-900/60 p-5 ring-1 ring-neutral-800">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-neutral-500">
        Top 10
      </p>
      {scores.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-600">No scores yet — be the first!</p>
      ) : (
        <ol className="space-y-1.5">
          {scores.map((s, i) => {
            const me = highlightName && s.display_name === highlightName;
            return (
              <li
                key={`${s.display_name}-${s.created_at}`}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  me ? "bg-amber-400/10 ring-1 ring-amber-400/40" : "odd:bg-neutral-900"
                }`}
              >
                <span className="w-6 font-bold text-neutral-500">{i + 1}.</span>
                <span className="flex-1 truncate font-bold">{s.display_name}</span>
                <span className="mr-2 text-xs tabular-nums text-amber-400">🔥{s.streak}</span>
                <span className="font-black tabular-nums text-emerald-400">{s.score}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

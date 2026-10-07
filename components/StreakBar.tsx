type Props = {
  streak: number;
  score: number;
  strikes?: number;
  maxStrikes?: number;
};

export default function StreakBar({
  streak,
  score,
  strikes = 0,
  maxStrikes = 3,
}: Props) {
  return (
    <div className="flex w-full flex-col items-center gap-3 px-6 pt-6">
      <div className="flex items-start justify-center gap-10 sm:gap-20">
        <Stat value={streak} label="🔥 Streak" color="amber" />
        <Stat value={score} label="Points" color="emerald" />
      </div>
      <Strikes count={strikes} max={maxStrikes} />
    </div>
  );
}

function Stat({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: "amber" | "emerald";
}) {
  const valueClass = color === "amber" ? "text-amber-400" : "text-emerald-400";
  const labelClass = color === "amber" ? "text-amber-500/70" : "text-emerald-500/70";
  return (
    <div className="flex flex-col items-center">
      <span
        className={`text-5xl font-black leading-none tabular-nums sm:text-6xl ${valueClass}`}
      >
        {value}
      </span>
      <span
        className={`mt-1.5 text-[11px] font-bold uppercase tracking-[0.25em] ${labelClass}`}
      >
        {label}
      </span>
    </div>
  );
}

function Strikes({ count, max }: { count: number; max: number }) {
  return (
    <div className="flex items-center gap-5 sm:gap-6">
      {Array.from({ length: max }).map((_, i) => {
        const active = i < count;
        return (
          <div
            key={i}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-[3px] text-5xl font-black sm:h-24 sm:w-24 sm:text-6xl ${
              active
                ? "border-rose-400 text-rose-400"
                : "border-neutral-700 text-neutral-700"
            }`}
          >
            ✗
          </div>
        );
      })}
    </div>
  );
}

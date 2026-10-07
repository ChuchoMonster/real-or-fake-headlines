export type Badge = {
  threshold: number;
  name: string;
  description: string;
  emoji: string;
};

export const BADGES: Badge[] = [
  {
    threshold: 20,
    emoji: "📡",
    name: "Noise Filter",
    description: "You're starting to tell the signal from the static.",
  },
  {
    threshold: 40,
    emoji: "🔍",
    name: "Headline Hunter",
    description: "Most people scroll past. You actually read.",
  },
  {
    threshold: 60,
    emoji: "🌀",
    name: "Spin Detector",
    description: "You can smell a story being managed.",
  },
  {
    threshold: 80,
    emoji: "🤐",
    name: "Off the Record",
    description: "You know what they didn't print and why.",
  },
  {
    threshold: 100,
    emoji: "🛡️",
    name: "Deepfake Proof",
    description: "The fakes don't fool you anymore.",
  },
  {
    threshold: 120,
    emoji: "🧮",
    name: "Human Algorithm",
    description: "You're processing truth faster than the machines.",
  },
  {
    threshold: 140,
    emoji: "📰",
    name: "The Source",
    description: "At this level, you basically are the fact-checker.",
  },
];

/** Highest badge earned at the given score, or null if under the first threshold. */
export function currentBadge(score: number): Badge | null {
  let current: Badge | null = null;
  for (const b of BADGES) {
    if (score >= b.threshold) current = b;
    else break;
  }
  return current;
}

/** All badges earned at the given score. */
export function earnedBadges(score: number): Badge[] {
  return BADGES.filter((b) => score >= b.threshold);
}

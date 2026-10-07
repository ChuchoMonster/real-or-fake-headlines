export type Praise = {
  line: string;
  emoji: string;
};

export const PRAISES: Praise[] = [
  { line: "The algorithm underestimated you.", emoji: "🎯" },
  { line: "You read that room.", emoji: "👁️" },
  { line: "Most people missed that one.", emoji: "📊" },
  { line: "That one trips up a lot of people. Not you.", emoji: "🦶" },
  { line: "Human: 1. Machine: 0.", emoji: "🧠" },
  { line: "Your pattern recognition is showing. Keep going.", emoji: "🔍" },
  { line: "Trained eye.", emoji: "✨" },
  { line: "You're getting harder to fool.", emoji: "🛡️" },
];

export function randomPraise(): Praise {
  return PRAISES[Math.floor(Math.random() * PRAISES.length)];
}

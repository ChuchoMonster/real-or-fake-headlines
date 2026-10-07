export type Taunt = {
  line: string;
  emoji: string;
};

export const TAUNTS: Taunt[] = [
  {
    line: "And that's exactly what they wanted you to think.",
    emoji: "🎭",
  },
  {
    line: "Don't feel bad. That one fooled a lot of humans.",
    emoji: "🫂",
  },
  {
    line: "The bots are taking notes on you right now.",
    emoji: "🤖",
  },
  {
    line: "Somewhere, a content farm just celebrated.",
    emoji: "🎉",
  },
  {
    line: "Even the intern who wrote that didn't think it would work!",
    emoji: "📝",
  },
  {
    line: "Got you.",
    emoji: "😏",
  },
  {
    line: "Embarrassing.",
    emoji: "🫣",
  },
  {
    line: "That was bait. You bit.",
    emoji: "🎣",
  },
  {
    line: "Fake news wins again.",
    emoji: "🗞️",
  },
  {
    line: "Clickbait: 1. Critical thinking: 0.",
    emoji: "🧠",
  },
  {
    line: "Gotcha journalism got you.",
    emoji: "📸",
  },
];

export function randomTaunt(): Taunt {
  return TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
}

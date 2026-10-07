import type { BlankRound, BonusRound, NormalRound, Round } from "@/lib/types";

export function normals(reals: number, fakes: number): NormalRound[] {
  const make = (isReal: boolean, i: number): NormalRound => ({
    kind: "normal",
    id: `${isReal ? "real" : "fake"}-${i}`,
    headline: `Fictional ${isReal ? "real" : "fake"} headline number ${i}`,
    isReal,
    revealText: "test",
  });
  return [
    ...Array.from({ length: reals }, (_, i) => make(true, i)),
    ...Array.from({ length: fakes }, (_, i) => make(false, i)),
  ];
}

export function bonuses(n: number): BonusRound[] {
  return Array.from({ length: n }, (_, i) => ({
    kind: "bonus",
    id: `bonus-${i}`,
    subject: "Test subject",
    choices: [true, false, false].map((isReal, c) => ({
      id: `bonus-${i}-${c}`,
      headline: `Choice ${c}`,
      isReal,
      revealText: "test",
    })),
  }));
}

export function blanks(n: number): BlankRound[] {
  return Array.from({ length: n }, (_, i) => ({
    kind: "blank",
    id: `blank-${i}`,
    template: "_____ adopted a three-legged goat",
    answer: "Pat Example",
    choices: ["Pat Example", "Sam Sample", "Alex Placeholder"],
    originalHeadline: "Pat Example adopted a three-legged goat",
    revealText: "test",
  }));
}

/** One letter per round: N = normal, B = pick-the-real bonus, K = fill-in-the-blank. */
export const kinds = (seq: Round[]) =>
  seq.map((r) => (r.kind === "normal" ? "N" : r.kind === "bonus" ? "B" : "K")).join("");

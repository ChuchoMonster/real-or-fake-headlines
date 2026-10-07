import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRoundSequence, shuffled } from "@/lib/headlines/mockData";
import type { NormalRound } from "@/lib/types";
import { blanks, bonuses, kinds, normals } from "../helpers/rounds";

afterEach(() => vi.restoreAllMocks());

describe("shuffled", () => {
  it("returns a permutation and leaves the input untouched", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffled(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(out).not.toBe(input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });
});

describe("buildRoundSequence", () => {
  it("uses every round exactly once", () => {
    for (let run = 0; run < 50; run++) {
      const n = normals(6, 6);
      const b = bonuses(3);
      const k = blanks(2);
      const ids = buildRoundSequence(n, b, k).map((r) => r.id);
      expect(ids).toHaveLength(n.length + b.length + k.length);
      expect(new Set(ids)).toEqual(new Set([...n, ...b, ...k].map((r) => r.id)));
    }
  });

  it("always opens with three normal rounds containing at least one real and one fake", () => {
    for (let run = 0; run < 200; run++) {
      const seq = buildRoundSequence(normals(5, 5), bonuses(2), blanks(2));
      const opening = seq.slice(0, 3) as NormalRound[];
      expect(opening.every((r) => r.kind === "normal")).toBe(true);
      expect(opening.some((r) => r.isReal)).toBe(true);
      expect(opening.some((r) => !r.isReal)).toBe(true);
    }
  });

  it("still mixes the opening when the pool is lopsided (one real among many fakes)", () => {
    for (let run = 0; run < 50; run++) {
      const opening = buildRoundSequence(normals(1, 8), []).slice(0, 3) as NormalRound[];
      expect(opening.filter((r) => r.isReal)).toHaveLength(1);
    }
  });

  it("makes round 4 a bonus whenever one is available, even with only blank rounds", () => {
    for (let run = 0; run < 50; run++) {
      expect(buildRoundSequence(normals(4, 4), bonuses(2), blanks(2))[3].kind).not.toBe("normal");
      expect(buildRoundSequence(normals(4, 4), [], blanks(1))[3].kind).toBe("blank");
    }
  });

  it.each([
    [0, 3], // Math.random() = 0 -> the shortest gap, BONUS_MIN_GAP
    [0.999, 8], // Math.random() ~ 1 -> the longest gap, BONUS_MAX_GAP
  ])("spaces bonus rounds by the random gap (random=%s -> %s normals apart)", (r, gap) => {
    vi.spyOn(Math, "random").mockReturnValue(r);
    const seq = kinds(buildRoundSequence(normals(15, 15), bonuses(3)));
    const between = "N".repeat(gap);
    expect(seq.startsWith(`NNNB${between}B${between}B`)).toBe(true);
  });

  it("fires the bonus first when both tracks are due, then the blank immediately after", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const seq = kinds(buildRoundSequence(normals(6, 6), bonuses(3), blanks(3)));
    expect(seq).toBe("NNNB" + "NNNBK" + "NNNBK" + "NNNK");
  });

  it("appends leftover bonus and blank rounds when normals run out", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(kinds(buildRoundSequence(normals(2, 2), bonuses(3), blanks(2)))).toBe("NNNBNBBKK");
  });
});

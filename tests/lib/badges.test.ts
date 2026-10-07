import { describe, expect, it } from "vitest";
import { BADGES, currentBadge, earnedBadges } from "@/lib/badges";

describe("badges", () => {
  it("are ordered by ascending threshold, which currentBadge relies on", () => {
    const thresholds = BADGES.map((b) => b.threshold);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
  });

  it("currentBadge returns the highest badge reached, inclusive of the threshold", () => {
    expect(currentBadge(0)).toBeNull();
    expect(currentBadge(19)).toBeNull();
    expect(currentBadge(20)?.name).toBe("Noise Filter");
    expect(currentBadge(59)?.name).toBe("Headline Hunter");
    expect(currentBadge(10_000)?.name).toBe("The Source");
  });

  it("earnedBadges lists every badge at or below the score", () => {
    expect(earnedBadges(19)).toEqual([]);
    expect(earnedBadges(60).map((b) => b.threshold)).toEqual([20, 40, 60]);
  });
});

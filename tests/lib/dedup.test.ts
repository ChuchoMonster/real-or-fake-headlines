import { describe, expect, it } from "vitest";
import { dedupeRaw } from "@/lib/ingestion/dedup";
import type { RawHeadline } from "@/lib/sources/types";

const raw = (headline: string, source_name = "Daily Gazette"): RawHeadline => ({
  headline,
  source_url: `https://example.test/${encodeURIComponent(headline)}`,
  source_name,
});

describe("dedupeRaw", () => {
  it("treats case, punctuation and accents as the same headline and keeps the first copy", () => {
    const out = dedupeRaw([
      raw("Café owner discovered 300-year-old coin under kitchen floorboards", "First Paper"),
      raw("CAFE OWNER DISCOVERED 300 YEAR OLD COIN UNDER KITCHEN FLOORBOARDS!", "Second Paper"),
      raw("cafe owner discovered 300-year-old coin under kitchen floorboards...", "Third Paper"),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].source_name).toBe("First Paper");
  });

  it("drops low-quality headlines before deduplicating", () => {
    const out = dedupeRaw([
      raw("You won't believe what this Ohio farmer discovered in his barn"),
      raw("Zoo penguin escapes enclosure and rides city bus to the aquarium"),
    ]);
    expect(out.map((r) => r.headline)).toEqual([
      "Zoo penguin escapes enclosure and rides city bus to the aquarium",
    ]);
  });

  it("trims surrounding whitespace and preserves order of distinct headlines", () => {
    const out = dedupeRaw([
      raw("   Zoo penguin escapes enclosure and rides city bus to the aquarium  "),
      raw("Ohio farmer discovered 40-pound pumpkin growing inside abandoned school bus"),
    ]);
    expect(out.map((r) => r.headline)).toEqual([
      "Zoo penguin escapes enclosure and rides city bus to the aquarium",
      "Ohio farmer discovered 40-pound pumpkin growing inside abandoned school bus",
    ]);
  });
});

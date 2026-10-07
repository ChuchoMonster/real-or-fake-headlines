import { describe, expect, it } from "vitest";
import { isLowQualityHeadline } from "@/lib/ingestion/quality";

const rejected = (h: string) => isLowQualityHeadline(h);

describe("isLowQualityHeadline", () => {
  it("keeps specific, eventful headlines", () => {
    expect(rejected("Ohio farmer discovered 40-pound pumpkin growing inside abandoned school bus")).toBe(false);
    expect(rejected("Zoo penguin escapes enclosure and rides city bus to the aquarium")).toBe(false);
    // \btrump\b must not fire inside an unrelated word
    expect(rejected("Trumpet player stunned commuters by performing on a moving ferry")).toBe(false);
  });

  it("enforces the length and word-count bounds independently", () => {
    // 6 words but only 18 characters
    expect(rejected("A cat ran to a car")).toBe(true);
    // long enough, has an event verb, but only 4 words
    expect(rejected("Councilwoman resigned unexpectedly yesterday")).toBe(true);
    // over the 120-character cap that keeps headlines legible on the newspaper
    const long =
      "Village council approved plan to repaint every lamppost in town bright orange " +
      "after residents complained the old grey ones looked gloomy";
    expect(long.length).toBeGreaterThan(120);
    expect(rejected(long)).toBe(true);
  });

  it("rejects noun-phrase headlines with no event verb, and accepts them once a verb appears", () => {
    expect(rejected("Costumed llama on the main stage at the summer festival")).toBe(true);
    expect(rejected("Costumed llama walked across the main stage at the summer festival")).toBe(false);
  });

  it("rejects clickbait, video/live cruft and listicles", () => {
    expect(rejected("You won't believe what this Ohio farmer discovered in his barn")).toBe(true);
    expect(rejected("WATCH: Penguin escapes enclosure and rides city bus to aquarium")).toBe(true);
    expect(rejected("10 things the mayor revealed about the town's secret tunnel network")).toBe(true);
  });

  it("rejects topics the game keeps off-limits: deaths, the sitting president, active conflicts", () => {
    expect(rejected("Beloved local baker dies at 92 after decades of serving the town")).toBe(true);
    expect(rejected("Trump signed order renaming the national bird after a long debate")).toBe(true);
    expect(rejected("Ukraine officials announced new rail line to the western border")).toBe(true);
  });

  it("rejects boring corporate news and blocked sources", () => {
    expect(rejected("Acme Widgets quietly removes popular feature from its flagship app")).toBe(true);
    expect(rejected("Acme Widgets reported record Q3 earnings after strong holiday sales")).toBe(true);
    expect(rejected("Reporter wrote about the strange town on medium.com yesterday evening")).toBe(true);
  });
});

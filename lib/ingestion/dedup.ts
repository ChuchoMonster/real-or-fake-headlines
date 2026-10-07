import type { RawHeadline } from "@/lib/sources/types";
import { isLowQualityHeadline } from "./quality";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deduplicate raw headlines by normalized text AND filter out low-quality
 * headlines (clickbait patterns, local-syndication templates, video stubs).
 */
export function dedupeRaw(raws: RawHeadline[]): RawHeadline[] {
  const seen = new Set<string>();
  const result: RawHeadline[] = [];
  for (const r of raws) {
    if (isLowQualityHeadline(r.headline)) continue;
    const n = normalize(r.headline);
    if (n.length < 15) continue;
    if (n.length > 300) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    result.push({ ...r, headline: r.headline.trim() });
  }
  return result;
}

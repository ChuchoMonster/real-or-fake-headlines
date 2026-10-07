import {
  buildRoundSequence,
  mockBonusRounds,
  mockNormalRounds,
  shuffled,
} from "@/lib/headlines/mockData";
import { fetchRoundsFromPool } from "@/lib/pool/read";
import type { HeadlinesResponse, Round } from "@/lib/types";

export const dynamic = "force-dynamic";

function fallbackMockRounds(): Round[] {
  const sequence = buildRoundSequence(
    shuffled(mockNormalRounds),
    shuffled(mockBonusRounds)
  );
  return sequence.map((r) =>
    r.kind === "bonus" ? { ...r, choices: shuffled(r.choices) } : r
  );
}

export async function GET() {
  try {
    const { rounds, source } = await fetchRoundsFromPool();
    if (source === "pool" && rounds.length > 0) {
      const body: HeadlinesResponse = { rounds };
      return Response.json(body);
    }
    // Pool is empty (ingestion hasn't run yet in dev) — fall back to mock data
    // so the game is still playable. Remove this fallback for prod.
    const body: HeadlinesResponse = { rounds: fallbackMockRounds() };
    return Response.json(body);
  } catch (e) {
    console.error("[api/headlines]", e);
    const body: HeadlinesResponse = { rounds: fallbackMockRounds() };
    return Response.json(body);
  }
}

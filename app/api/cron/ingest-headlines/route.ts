import { fetchAllRealHeadlines } from "@/lib/sources";
import { dedupeRaw } from "@/lib/ingestion/dedup";
import {
  insertRealHeadlines,
  insertFakeHeadlines,
  insertBonusSet,
  insertBlankRounds,
  pruneOldHeadlines,
} from "@/lib/ingestion/insert";
import {
  generateFakes,
  generateBonusSet,
  generateBlankRounds,
} from "@/lib/headlines/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // seconds — Vercel pro+ needed for >60s in prod

// Per-run limits. Bumped via query params or env later if needed.
const PLAUSIBLE_FAKES_PER_RUN = 20;
const EDGY_FAKES_PER_RUN = 20;
const BONUS_SETS_PER_RUN = 5;
const BLANK_ROUNDS_PER_RUN = 10;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  // Also accept ?secret=... for easy curl testing
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

type Summary = {
  startedAt: string;
  durationMs?: number;
  fetched?: number;
  fetchedBySource?: Record<string, number>;
  dedupedRaw?: number;
  realsInserted?: number;
  plausibleFakesGenerated?: number;
  edgyFakesGenerated?: number;
  fakesInserted?: number;
  bonusSetsAttempted?: number;
  bonusSetsInserted?: number;
  blanksGenerated?: number;
  blanksInserted?: number;
  pruned?: number;
  error?: string;
};

async function runIngestion(): Promise<Summary> {
  const summary: Summary = { startedAt: new Date().toISOString() };
  const started = Date.now();

  // 1. Fetch + dedupe reals
  const { headlines: raws, stats } = await fetchAllRealHeadlines();
  summary.fetched = raws.length;
  summary.fetchedBySource = stats.bySource;

  const unique = dedupeRaw(raws);
  summary.dedupedRaw = unique.length;

  // 2. Insert reals
  summary.realsInserted = await insertRealHeadlines(unique);

  // 3. Generate fakes in parallel — sample of ~20 reals for reference
  const sample = unique.slice(0, 25).map((r) => r.headline);
  if (sample.length > 0) {
    const [plausible, edgy] = await Promise.all([
      generateFakes(sample, PLAUSIBLE_FAKES_PER_RUN, "plausible").catch((e) => {
        console.error("[cron] plausible fakes failed", e);
        return [];
      }),
      generateFakes(sample, EDGY_FAKES_PER_RUN, "edgy").catch((e) => {
        console.error("[cron] edgy fakes failed", e);
        return [];
      }),
    ]);
    summary.plausibleFakesGenerated = plausible.length;
    summary.edgyFakesGenerated = edgy.length;
    summary.fakesInserted = await insertFakeHeadlines([...plausible, ...edgy]);
  } else {
    summary.plausibleFakesGenerated = 0;
    summary.edgyFakesGenerated = 0;
    summary.fakesInserted = 0;
  }

  // 4. Bonus sets — pick a few reals and ask Claude to spin each into a bonus trio
  const bonusCandidates = unique.slice(0, BONUS_SETS_PER_RUN);
  summary.bonusSetsAttempted = bonusCandidates.length;
  let bonusInserted = 0;
  for (const real of bonusCandidates) {
    try {
      const bonus = await generateBonusSet(real.headline);
      if (!bonus) continue;
      const ok = await insertBonusSet({
        subject: bonus.subject,
        real: {
          headline: real.headline,
          source_url: real.source_url,
          source_name: real.source_name,
          reveal_text: `Real — reported by ${real.source_name}.`,
        },
        fakes: bonus.fakes,
      });
      if (ok) bonusInserted++;
    } catch (e) {
      console.error("[cron] bonus set failed", e);
    }
  }
  summary.bonusSetsInserted = bonusInserted;

  // 5. Blank rounds — transform famous-person headlines into fill-the-blanks
  try {
    const blanks = await generateBlankRounds(
      unique.map((r) => r.headline),
      BLANK_ROUNDS_PER_RUN
    );
    summary.blanksGenerated = blanks.length;
    const toInsert = blanks
      .map((b) => {
        const src = unique[b.fromIndex];
        if (!src) return null;
        return {
          template: b.template,
          answer: b.answer,
          distractors: b.distractors,
          revealText: b.reveal_text,
          originalHeadline: src.headline,
          source_url: src.source_url,
          source_name: src.source_name,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    summary.blanksInserted = await insertBlankRounds(toInsert);
  } catch (e) {
    console.error("[cron] blank rounds failed", e);
    summary.blanksGenerated = 0;
    summary.blanksInserted = 0;
  }

  // 6. Prune headlines older than 10 days
  summary.pruned = await pruneOldHeadlines(10);

  summary.durationMs = Date.now() - started;
  return summary;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runIngestion();
    return Response.json({ ok: true, summary });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "ingest failed" },
      { status: 500 }
    );
  }
}

// Allow GET too for easy curl testing during dev.
export async function GET(request: Request) {
  return POST(request);
}

import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateFakes,
  generateBonusSet,
  generateBlankRounds,
} from "@/lib/headlines/claude";
import {
  insertFakeHeadlines,
  insertBonusSet,
  insertBlankRounds,
} from "@/lib/ingestion/insert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PLAUSIBLE_COUNT = 25;
const EDGY_COUNT = 15;
const BONUS_COUNT = 5;
const BLANK_MAX = 10;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

/**
 * Dev helper: wipe all existing fake/bonus rows and regenerate against the
 * current real pool using the latest Claude prompt. Lets us iterate on the
 * prompt without re-fetching the real sources (which takes ~80s).
 */
async function regen() {
  const admin = createAdminClient();
  const summary: Record<string, unknown> = {
    startedAt: new Date().toISOString(),
  };

  // 1. Delete only NORMAL fakes — keep bonus and blank rows so they accumulate
  //    over multiple runs and the player sees more variety.
  const wipe = await admin
    .from("headlines")
    .delete({ count: "exact" })
    .eq("is_real", false)
    .eq("kind", "normal");
  summary.normalFakesDeleted = wipe.count ?? 0;

  // 2. No orphan cleanup needed — we no longer wipe bonus fakes.

  // 3. Grab a sample of real headlines to seed the generator.
  // Pull a WIDE sample from across the pool (not just recent) and exclude
  // Florida headlines entirely from the reference set — Claude pattern-matches
  // on them and produces 50% Florida fakes otherwise.
  const { data: realData } = await admin
    .from("headlines")
    .select("headline, source_url, source_name")
    .eq("kind", "normal")
    .eq("is_real", true)
    .not("headline", "ilike", "%florida%")
    .limit(150);
  const pool = (realData ?? []) as {
    headline: string;
    source_url: string;
    source_name: string;
  }[];
  // Shuffle + take 30 so Claude sees a diverse random slice every run.
  const reals = pool.sort(() => Math.random() - 0.5).slice(0, 30);
  summary.realsSampled = reals.length;
  if (reals.length === 0) {
    summary.error = "no real headlines in pool — run /api/cron/ingest-headlines first";
    return summary;
  }

  const refs = reals.map((r) => r.headline);

  // 4. Generate fakes — 60/40 plausible/edgy (biased toward plausible after feedback)
  const [plausible, edgy] = await Promise.all([
    generateFakes(refs, PLAUSIBLE_COUNT, "plausible").catch((e) => {
      console.error("[regen] plausible", e);
      return [];
    }),
    generateFakes(refs, EDGY_COUNT, "edgy").catch((e) => {
      console.error("[regen] edgy", e);
      return [];
    }),
  ]);
  summary.plausibleGenerated = plausible.length;
  summary.edgyGenerated = edgy.length;
  summary.fakesInserted = await insertFakeHeadlines([...plausible, ...edgy]);

  // 5. Bonus sets
  let bonusInserted = 0;
  for (const real of reals.slice(0, BONUS_COUNT)) {
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
      console.error("[regen] bonus", e);
    }
  }
  summary.bonusSetsInserted = bonusInserted;

  // 6. Blank rounds — ask Claude to identify famous-person headlines
  //    and transform them into fill-the-blank rounds.
  //    Pull a LARGER sample from the pool (not just the first 30) so we
  //    get enough famous-person coverage — tabloid/odd-news sources have
  //    low hit rates, so sampling wide matters.
  const { data: wideReals } = await admin
    .from("headlines")
    .select("headline, source_url, source_name")
    .eq("kind", "normal")
    .eq("is_real", true)
    .order("created_at", { ascending: false })
    .limit(150);
  const wide = (wideReals ?? []) as typeof reals;
  summary.blankSampleSize = wide.length;
  summary.blankSamplePreview = wide.slice(0, 5).map((r) => r.headline);

  try {
    const blanks = await generateBlankRounds(
      wide.map((r) => r.headline),
      BLANK_MAX
    );
    summary.blanksGenerated = blanks.length;
    const toInsert = blanks
      .map((b) => {
        const src = wide[b.fromIndex];
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
    console.error("[regen] blanks", e);
    summary.blanksGenerated = 0;
    summary.blanksInserted = 0;
  }

  return summary;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await regen();
    return Response.json({ ok: true, summary });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "regen failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}

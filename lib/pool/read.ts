import { createClient } from "@/lib/supabase/server";
import {
  buildRoundSequence,
  shuffled,
} from "@/lib/headlines/mockData";
import { isLowQualityHeadline } from "@/lib/ingestion/quality";
import type { BlankRound, BonusRound, NormalRound, Round } from "@/lib/types";

type PoolRow = {
  id: string;
  kind: "normal" | "bonus" | "blank";
  is_real: boolean;
  headline: string;
  source_url: string | null;
  source_name: string | null;
  reveal_text: string;
  subject: string | null;
  bonus_group: string | null;
  blank_template: string | null;
  blank_answer: string | null;
  blank_distractors: string[] | null;
};

const TARGET_NORMAL = 8;
const TARGET_BONUS = 2;
const TARGET_BLANK = 2;
const MAX_FLORIDA_PER_GROUP = 1;

/** Strip trailing " - Publication Name" suffixes from RSS/Google News.
 *  Only strips if the result is still long enough to be a real headline. */
function cleanHeadline(h: string): string {
  const cleaned = h
    .replace(/\s+[-–—|]\s+[A-Z][\w\s&'.,:]{2,}$/, "")
    .replace(/\s+[-–—|]\s+\S+\.\S+$/, "")
    .trim();
  // Don't strip if it would leave a stub
  if (cleaned.split(/\s+/).length < 5 || cleaned.length < 25) {
    return h.trim();
  }
  return cleaned;
}

function asNormalRound(r: PoolRow): NormalRound {
  return {
    kind: "normal",
    id: r.id,
    headline: cleanHeadline(r.headline),
    isReal: r.is_real,
    source: r.source_url ?? undefined,
    revealText: r.reveal_text,
  };
}

function asBonusRound(groupId: string, rows: PoolRow[]): BonusRound {
  return {
    kind: "bonus",
    id: groupId,
    subject: rows[0]?.subject ?? "",
    choices: shuffled(rows).map((r) => ({
      id: r.id,
      headline: r.headline,
      isReal: r.is_real,
      source: r.source_url ?? undefined,
      revealText: r.reveal_text,
    })),
  };
}

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

/**
 * Fetch ALL headlines of a given kind from the DB. NO db-level seen filter —
 * we filter in JavaScript to avoid Supabase URL length limits with large
 * NOT IN clauses. Quality filter also applied here.
 */
async function fetchAll(
  supabase: SupabaseLike,
  kind: "normal" | "bonus" | "blank"
): Promise<PoolRow[]> {
  const { data, error } = await supabase
    .from("headlines")
    .select(
      "id, kind, is_real, headline, source_url, source_name, reveal_text, subject, bonus_group, blank_template, blank_answer, blank_distractors"
    )
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.error("[pool/read] fetchAll", kind, error.message);
    return [];
  }
  const rows = (data ?? []) as PoolRow[];
  return rows.filter((r) => !isLowQualityHeadline(r.headline));
}

const isFlorida = (r: PoolRow) => /\bflorida\b/i.test(r.headline);

function pickBalanced(pool: PoolRow[], target: number): PoolRow[] {
  const florida = shuffled(pool.filter(isFlorida));
  const other = shuffled(pool.filter((r) => !isFlorida(r)));
  const picks: PoolRow[] = [];
  picks.push(...florida.slice(0, MAX_FLORIDA_PER_GROUP));
  picks.push(...other.slice(0, target - picks.length));
  return picks;
}

export type PoolFetchResult = {
  rounds: Round[];
  source: "pool" | "empty";
};

export async function fetchRoundsFromPool(): Promise<PoolFetchResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Build seen-ID set for logged-in users
  const seenSet = new Set<string>();
  if (user) {
    const { data } = await supabase
      .from("user_seen_headlines")
      .select("headline_id")
      .eq("user_id", user.id);
    for (const r of data ?? []) {
      seenSet.add((r as { headline_id: string }).headline_id);
    }
  }

  // --- Fetch ALL headlines by kind, filter seen in JavaScript ---
  const allNormals = await fetchAll(supabase, "normal");
  const allBonus = await fetchAll(supabase, "bonus");
  const allBlanks = await fetchAll(supabase, "blank");

  // Filter to unseen only; fall back to full pool per type if unseen runs dry
  let normals = allNormals.filter((r) => !seenSet.has(r.id));
  const unseenReals = normals.filter((r) => r.is_real).length;
  const unseenFakes = normals.filter((r) => !r.is_real).length;

  // If we don't have enough of EITHER type, fall back to full pool
  if (unseenReals < Math.ceil(TARGET_NORMAL / 2) || unseenFakes < Math.floor(TARGET_NORMAL / 2)) {
    normals = allNormals;
  }

  // --- NORMAL rounds: pick balanced 50/50 real/fake ---
  const halfReal = Math.ceil(TARGET_NORMAL / 2);
  const halfFake = Math.floor(TARGET_NORMAL / 2);
  const realPool = normals.filter((r) => r.is_real);
  const fakePool = normals.filter((r) => !r.is_real);
  const realPicks = pickBalanced(realPool, halfReal);
  const fakePicks = pickBalanced(fakePool, halfFake);
  const normalPicks = shuffled([...realPicks, ...fakePicks]).slice(0, TARGET_NORMAL);
  const normalRounds: NormalRound[] = normalPicks.map(asNormalRound);

  // Log the balance for debugging
  console.log(
    `[pool/read] normals: ${normalPicks.length} (${realPicks.length} real, ${fakePicks.length} fake) | unseen: ${unseenReals}r ${unseenFakes}f | seenTotal: ${seenSet.size}`
  );

  // --- BONUS rounds ---
  let bonusRows = allBonus.filter((r) => !seenSet.has(r.id));
  if (bonusRows.length === 0) bonusRows = allBonus;

  const groups = new Map<string, PoolRow[]>();
  for (const r of bonusRows) {
    if (!r.bonus_group) continue;
    const existing = groups.get(r.bonus_group) ?? [];
    existing.push(r);
    groups.set(r.bonus_group, existing);
  }
  const wellFormed = Array.from(groups.entries()).filter(
    ([, rows]) => rows.length === 3 && rows.filter((r) => r.is_real).length === 1
  );
  const bonusPicks = shuffled(wellFormed).slice(0, TARGET_BONUS);
  const bonusRounds: BonusRound[] = bonusPicks.map(([id, rows]) =>
    asBonusRound(id, rows)
  );

  // --- BLANK rounds ---
  let blankRows = allBlanks.filter((r) => !seenSet.has(r.id));
  if (blankRows.length === 0) blankRows = allBlanks;

  const validBlanks = blankRows.filter(
    (r) =>
      r.blank_template &&
      r.blank_answer &&
      Array.isArray(r.blank_distractors) &&
      r.blank_distractors.length >= 2
  );
  const blankPicks = shuffled(validBlanks).slice(0, TARGET_BLANK);
  const blankRounds: BlankRound[] = blankPicks.map((r) => {
    const choices = shuffled([
      r.blank_answer!,
      ...(r.blank_distractors ?? []).slice(0, 2),
    ]);
    return {
      kind: "blank",
      id: r.id,
      template: r.blank_template!,
      answer: r.blank_answer!,
      choices,
      originalHeadline: r.headline,
      revealText: r.reveal_text,
      source: r.source_url ?? undefined,
    };
  });

  if (normalRounds.length === 0) {
    return { rounds: [], source: "empty" };
  }

  const sequence = buildRoundSequence(normalRounds, bonusRounds, blankRounds);

  // --- Record seen for logged-in users (use admin client to bypass RLS issues) ---
  if (user && sequence.length > 0) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const newSeen: { user_id: string; headline_id: string }[] = [];
    const bonusRowByGroup = new Map<string, PoolRow[]>();
    for (const [id, rows] of bonusPicks) bonusRowByGroup.set(id, rows);

    for (const round of sequence) {
      if (round.kind === "normal") {
        newSeen.push({ user_id: user.id, headline_id: round.id });
      } else if (round.kind === "bonus") {
        const rows = bonusRowByGroup.get(round.id) ?? [];
        for (const r of rows) {
          newSeen.push({ user_id: user.id, headline_id: r.id });
        }
      } else {
        newSeen.push({ user_id: user.id, headline_id: round.id });
      }
    }
    if (newSeen.length > 0) {
      const { error: seenErr } = await admin
        .from("user_seen_headlines")
        .upsert(newSeen, { onConflict: "user_id,headline_id", ignoreDuplicates: true });
      if (seenErr) console.error("[pool/read] record seen FAILED:", seenErr.message);
    }
  }

  return { rounds: sequence, source: "pool" };
}

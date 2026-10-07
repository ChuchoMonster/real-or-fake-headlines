import { createAdminClient } from "@/lib/supabase/admin";
import type { RawHeadline } from "@/lib/sources/types";

export async function insertRealHeadlines(raws: RawHeadline[]): Promise<number> {
  const admin = createAdminClient();
  let inserted = 0;
  for (const r of raws) {
    const { error } = await admin.from("headlines").insert({
      kind: "normal",
      is_real: true,
      headline: r.headline,
      source_url: r.source_url,
      source_name: r.source_name,
      reveal_text: `Real — reported by ${r.source_name}.`,
      tone: null,
    });
    // Unique-violation (already in DB) is expected and fine. Log anything else.
    if (!error) {
      inserted++;
    } else if (error.code !== "23505") {
      console.error("[insertRealHeadlines]", error.message);
    }
  }
  return inserted;
}

export type FakeRow = {
  headline: string;
  reveal_text: string;
  tone: "plausible" | "edgy";
};

export async function insertFakeHeadlines(fakes: FakeRow[]): Promise<number> {
  const admin = createAdminClient();
  let inserted = 0;
  for (const f of fakes) {
    // Server-side length enforcement — Claude sometimes ignores the word cap.
    const words = f.headline.trim().split(/\s+/).filter(Boolean).length;
    if (words > 15) continue;
    const { error } = await admin.from("headlines").insert({
      kind: "normal",
      is_real: false,
      headline: f.headline,
      reveal_text: f.reveal_text,
      tone: f.tone,
    });
    if (!error) {
      inserted++;
    } else if (error.code !== "23505") {
      console.error("[insertFakeHeadlines]", error.message);
    }
  }
  return inserted;
}

export type BonusSetInput = {
  subject: string;
  real: {
    headline: string;
    source_url: string;
    source_name: string;
    reveal_text: string;
  };
  fakes: { headline: string; reveal_text: string }[];
};

export async function insertBonusSet(set: BonusSetInput): Promise<boolean> {
  if (set.fakes.length < 2) return false;
  const admin = createAdminClient();
  const bonus_group = crypto.randomUUID();
  const rows = [
    {
      kind: "bonus" as const,
      is_real: true,
      headline: set.real.headline,
      source_url: set.real.source_url,
      source_name: set.real.source_name,
      reveal_text: set.real.reveal_text,
      subject: set.subject,
      bonus_group,
      tone: null,
    },
    ...set.fakes.slice(0, 2).map((f) => ({
      kind: "bonus" as const,
      is_real: false,
      headline: f.headline,
      source_url: null,
      source_name: null,
      reveal_text: f.reveal_text,
      subject: set.subject,
      bonus_group,
      tone: "plausible" as const,
    })),
  ];
  const { error } = await admin.from("headlines").insert(rows);
  if (error) {
    console.error("[insertBonusSet]", error.message);
    return false;
  }
  return true;
}

export type BlankInsertInput = {
  template: string;
  answer: string;
  distractors: string[];
  revealText: string;
  originalHeadline: string;
  source_url: string;
  source_name: string;
};

export async function insertBlankRounds(blanks: BlankInsertInput[]): Promise<number> {
  const admin = createAdminClient();
  let inserted = 0;
  for (const b of blanks) {
    const { error } = await admin.from("headlines").insert({
      kind: "blank",
      is_real: true,
      headline: b.originalHeadline,
      source_url: b.source_url,
      source_name: b.source_name,
      reveal_text: b.revealText,
      blank_template: b.template,
      blank_answer: b.answer,
      blank_distractors: b.distractors,
    });
    if (!error) {
      inserted++;
    } else if (error.code !== "23505") {
      console.error("[insertBlankRounds]", error.message);
    }
  }
  return inserted;
}

export async function pruneOldHeadlines(daysToKeep = 10): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
  const { error, count } = await admin
    .from("headlines")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);
  if (error) {
    console.error("[pruneOldHeadlines]", error.message);
    return 0;
  }
  return count ?? 0;
}

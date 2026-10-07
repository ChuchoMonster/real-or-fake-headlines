import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type LeaderboardEntry = {
  display_name: string;
  score: number;
  streak: number;
  created_at: string;
};

export type LeaderboardResponse = {
  scores: LeaderboardEntry[];
  userRank: number | null;
  userBest: number | null;
};

export type LeaderboardPeriod = "day" | "week" | "all";

type ScoreRow = {
  user_id: string;
  score: number;
  streak: number;
  created_at: string;
};

function periodStartIso(period: LeaderboardPeriod): string | null {
  const now = Date.now();
  if (period === "day") return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (period === "week") return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

function parsePeriod(v: string | null): LeaderboardPeriod {
  if (v === "day" || v === "week" || v === "all") return v;
  return "all";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("period"));
  const supabase = await createClient();

  // Top 10 for the period
  const topQuery = supabase
    .from("scores")
    .select("user_id, score, streak, created_at")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);
  const since = periodStartIso(period);
  const { data: scoreData, error: scoreErr } = since
    ? await topQuery.gte("created_at", since)
    : await topQuery;

  if (scoreErr) {
    return Response.json({ error: scoreErr.message }, { status: 500 });
  }

  const rows = (scoreData ?? []) as ScoreRow[];

  // Resolve display names for top 10
  let nameByUser = new Map<string, string>();
  if (rows.length > 0) {
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profileData, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    if (profileErr) {
      return Response.json({ error: profileErr.message }, { status: 500 });
    }

    nameByUser = new Map(
      (profileData ?? []).map((p: { user_id: string; display_name: string }) => [
        p.user_id,
        p.display_name,
      ])
    );
  }

  const scores: LeaderboardEntry[] = rows.map((row) => ({
    display_name: nameByUser.get(row.user_id) ?? "???",
    score: row.score,
    streak: row.streak,
    created_at: row.created_at,
  }));

  // Current user's best in the period + global rank
  let userRank: number | null = null;
  let userBest: number | null = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const bestQuery = supabase
      .from("scores")
      .select("score, created_at")
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1);
    const { data: bestData } = since
      ? await bestQuery.gte("created_at", since)
      : await bestQuery;

    if (bestData && bestData.length > 0) {
      const best = bestData[0] as { score: number; created_at: string };
      userBest = best.score;

      // Rank = (# of scores in period with strictly higher score) + 1
      const betterQuery = supabase
        .from("scores")
        .select("*", { count: "exact", head: true })
        .gt("score", best.score);
      const { count, error: rankErr } = since
        ? await betterQuery.gte("created_at", since)
        : await betterQuery;

      if (!rankErr) {
        userRank = (count ?? 0) + 1;
      }
    }
  }

  const body: LeaderboardResponse = { scores, userRank, userBest };
  return Response.json(body);
}

// Max possible points per round (a bonus is worth 10). Used as a sanity cap:
// roundsPlayed * this value is the ceiling we'll accept server-side. Rejects
// casual console cheats without rejecting legitimate runs.
const MAX_POINTS_PER_ROUND = 10;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "not signed in" }, { status: 401 });
  }

  const data = (await request.json()) as {
    score?: number;
    streak?: number;
    roundsPlayed?: number;
  };
  if (
    typeof data.score !== "number" ||
    typeof data.streak !== "number" ||
    typeof data.roundsPlayed !== "number"
  ) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const score = Math.max(0, Math.floor(data.score));
  const streak = Math.max(0, Math.floor(data.streak));
  const roundsPlayed = Math.max(0, Math.floor(data.roundsPlayed));
  const ceiling = roundsPlayed * MAX_POINTS_PER_ROUND;

  if (score > ceiling) {
    return Response.json(
      { error: `score ${score} exceeds max possible ${ceiling} for ${roundsPlayed} rounds` },
      { status: 400 }
    );
  }
  // Note: streak can exceed roundsPlayed with infinite play (multiple batches).
  // The score ceiling check above is sufficient anti-cheat protection.

  const { error } = await supabase
    .from("scores")
    .insert({ user_id: user.id, score, streak });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Return fresh top 10 after insert (all-time view by default)
  return GET(new Request(request.url));
}

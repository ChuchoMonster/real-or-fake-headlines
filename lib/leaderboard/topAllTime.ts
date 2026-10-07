import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/app/api/scores/route";

export type TopAllTime = {
  byPoints: LeaderboardEntry[];
  byStreak: LeaderboardEntry[];
  personalBest: LeaderboardEntry[];
};

type ScoreRow = {
  user_id: string;
  score: number;
  streak: number;
  created_at: string;
};

const LIMIT = 10;

export async function getTopAllTime(userId?: string | null): Promise<TopAllTime> {
  const supabase = await createClient();

  const queries = [
    supabase
      .from("scores")
      .select("user_id, score, streak, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(LIMIT),
    supabase
      .from("scores")
      .select("user_id, score, streak, created_at")
      .order("streak", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(LIMIT),
  ];

  const [pointsRes, streakRes] = await Promise.all(queries);

  if (pointsRes.error || streakRes.error) {
    return { byPoints: [], byStreak: [], personalBest: [] };
  }

  const pointsRows = (pointsRes.data ?? []) as ScoreRow[];
  const streakRows = (streakRes.data ?? []) as ScoreRow[];

  // Personal best — top 10 scores for the current user
  let personalRows: ScoreRow[] = [];
  if (userId) {
    const { data } = await supabase
      .from("scores")
      .select("user_id, score, streak, created_at")
      .eq("user_id", userId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(LIMIT);
    personalRows = (data ?? []) as ScoreRow[];
  }

  const userIds = Array.from(
    new Set([...pointsRows, ...streakRows, ...personalRows].map((r) => r.user_id))
  );

  let nameByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    nameByUser = new Map(
      (profiles ?? []).map((p: { user_id: string; display_name: string }) => [
        p.user_id,
        p.display_name,
      ])
    );
  }

  const mapRow = (r: ScoreRow): LeaderboardEntry => ({
    display_name: nameByUser.get(r.user_id) ?? "???",
    score: r.score,
    streak: r.streak,
    created_at: r.created_at,
  });

  return {
    byPoints: pointsRows.map(mapRow),
    byStreak: streakRows.map(mapRow),
    personalBest: personalRows.map(mapRow),
  };
}

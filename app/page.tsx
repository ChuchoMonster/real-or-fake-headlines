import GameShell from "@/components/GameShell";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { getTopAllTime } from "@/lib/leaderboard/topAllTime";

export default async function Home() {
  const user = await getCurrentUser();
  const displayName = user?.profile?.display_name ?? null;
  const topAllTime = await getTopAllTime(user?.id ?? null);

  return (
    <GameShell
      displayName={displayName}
      topAllTime={topAllTime}
    />
  );
}

"use client";

import { useCallback, useState } from "react";
import type { TopAllTime } from "@/lib/leaderboard/topAllTime";
import { CollectedRealsProvider } from "@/lib/hooks/collectedReals";
import AuthListener from "./AuthListener";
import Game from "./Game";
import Sidebar from "./Sidebar";
import SignInButton from "./SignInButton";

type Props = {
  displayName: string | null;
  topAllTime: TopAllTime;
};

/**
 * Client wrapper that tracks the Game's current phase so we can hide the
 * sidebar and reposition the sign-in button on the start screen.
 */
export default function GameShell({ displayName, topAllTime }: Props) {
  const [isStartScreen, setIsStartScreen] = useState(true);

  const onPhaseChange = useCallback((phase: string) => {
    setIsStartScreen(phase === "start");
  }, []);

  return (
    <CollectedRealsProvider>
      <AuthListener />
      {/* Sidebar — hidden on start screen */}
      {!isStartScreen && (
        <Sidebar topAllTime={topAllTime} personalBest={topAllTime.personalBest} />
      )}

      <main className="relative mx-auto flex min-h-dvh w-full max-w-4xl flex-1 flex-col">
        {/* Profile chip — top right, above everything including sidebar */}
        {!isStartScreen && displayName && (
          <div className="fixed right-4 top-4 z-50">
            <SignInButton displayName={displayName} />
          </div>
        )}

        <Game displayName={displayName} onPhaseChange={onPhaseChange} />
      </main>
    </CollectedRealsProvider>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  BlankRound,
  BonusRound,
  HeadlinesResponse,
  NormalRound,
  Round,
} from "@/lib/types";
import { POINTS_BONUS, POINTS_NORMAL } from "@/lib/types";
import { useCollectedReals } from "@/lib/hooks/collectedReals";

/** Fire-and-forget answer tracking. Never blocks the game loop. */
function trackAnswer(
  headlineId: string,
  wasCorrect: boolean,
  roundKind: "normal" | "bonus" | "blank"
) {
  fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      headline_id: headlineId,
      was_correct: wasCorrect,
      round_kind: roundKind,
    }),
    keepalive: true,
  }).catch(() => {
    // Tracking is best-effort — swallow errors so the game never breaks.
  });
}
import StartScreen from "./StartScreen";
import StreakBar from "./StreakBar";
import RoundScreen from "./RoundScreen";
import BonusRoundScreen from "./BonusRoundScreen";
import BlankRoundScreen from "./BlankRoundScreen";
import RevealScreen from "./RevealScreen";
import WrongScreen, { type WrongKind } from "./WrongScreen";
import GameOverScreen from "./GameOverScreen";

const MAX_STRIKES = 3;

type GameProps = {
  displayName: string | null;
  onPhaseChange?: (phase: string) => void;
};

type Phase =
  | { kind: "start" }
  | {
      kind: "round";
      index: number;
      streak: number;
      score: number;
      strikes: number;
    }
  | {
      // Brief "Correct!" green flash between rounds.
      kind: "reveal";
      index: number;
      streak: number;
      score: number;
      strikes: number;
    }
  | {
      // Brief red flash shown after a wrong answer. Returns to play unless
      // strikes hit MAX_STRIKES, in which case it transitions to gameover.
      kind: "wrongReveal";
      index: number;
      streak: number;
      score: number;
      strikes: number;
      losingRound: Round;
      pickedIdx?: number;
      wrongKind: WrongKind;
    }
  | {
      kind: "gameover";
      streak: number;
      score: number;
      losingRound?: Round;
      pickedIdx?: number;
    };

export default function Game({ displayName, onPhaseChange }: GameProps) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "start" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { add: addCollectedReal, clear: clearCollectedReals } =
    useCollectedReals();

  // Notify parent of phase changes via useEffect (not during render).
  useEffect(() => {
    onPhaseChange?.(phase.kind);
  }, [phase.kind, onPhaseChange]);

  const loadRounds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/headlines", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as HeadlinesResponse;
      setRounds(data.rounds);
      return data.rounds;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load headlines");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const start = useCallback(async () => {
    clearCollectedReals();
    const loaded = await loadRounds();
    if (loaded && loaded.length > 0) {
      setPhase({ kind: "round", index: 0, streak: 0, score: 0, strikes: 0 });
    }
  }, [loadRounds, clearCollectedReals]);

  const answerNormal = useCallback(
    (guessReal: boolean) => {
      if (phase.kind !== "round") return;
      const current = rounds[phase.index] as NormalRound;
      const correct = current.isReal === guessReal;
      trackAnswer(current.id, correct, "normal");
      if (correct) {
        if (current.isReal) {
          addCollectedReal({
            id: current.id,
            headline: current.headline,
            source: current.source,
          });
        }
        setPhase({
          kind: "reveal",
          index: phase.index,
          streak: phase.streak + 1,
          score: phase.score + POINTS_NORMAL,
          strikes: phase.strikes,
        });
      } else {
        // Picked "real" on a fake → Fake News (you fell for it).
        // Picked "fake" on a real → Gotcha (you distrusted a true story).
        setPhase({
          kind: "wrongReveal",
          index: phase.index,
          streak: 0,
          score: phase.score,
          strikes: phase.strikes + 1,
          losingRound: current,
          wrongKind: current.isReal ? "gotcha" : "fake-news",
        });
      }
    },
    [phase, rounds, addCollectedReal]
  );

  const answerBonus = useCallback(
    (choiceIdx: number) => {
      if (phase.kind !== "round") return;
      const current = rounds[phase.index] as BonusRound;
      const picked = current.choices[choiceIdx];
      const correct = picked.isReal;
      // Track the specific choice the player picked — that's the headline
      // that "tricked" them (or the real one they correctly identified).
      trackAnswer(picked.id, correct, "bonus");
      if (correct) {
        addCollectedReal({
          id: `${current.id}-real`,
          headline: picked.headline,
          source: picked.source,
        });
        setPhase({
          kind: "reveal",
          index: phase.index,
          streak: phase.streak + 1,
          score: phase.score + POINTS_BONUS,
          strikes: phase.strikes,
        });
      } else {
        // In a bonus round the player picked a fake thinking it was real → Fake News.
        setPhase({
          kind: "wrongReveal",
          index: phase.index,
          streak: 0,
          score: phase.score,
          strikes: phase.strikes + 1,
          losingRound: current,
          pickedIdx: choiceIdx,
          wrongKind: "fake-news",
        });
      }
    },
    [phase, rounds, addCollectedReal]
  );

  const answerBlank = useCallback(
    (choiceIdx: number) => {
      if (phase.kind !== "round") return;
      const current = rounds[phase.index] as BlankRound;
      const correct = current.choices[choiceIdx] === current.answer;
      trackAnswer(current.id, correct, "blank");
      if (correct) {
        addCollectedReal({
          id: current.id,
          headline: current.originalHeadline,
          source: current.source,
        });
        setPhase({
          kind: "reveal",
          index: phase.index,
          streak: phase.streak + 1,
          score: phase.score + POINTS_BONUS,
          strikes: phase.strikes,
        });
      } else {
        // Blank round: player picked the wrong name. Framed as "Gotcha!" —
        // they didn't know the answer.
        setPhase({
          kind: "wrongReveal",
          index: phase.index,
          streak: 0,
          score: phase.score,
          strikes: phase.strikes + 1,
          losingRound: current,
          pickedIdx: choiceIdx,
          wrongKind: "gotcha",
        });
      }
    },
    [phase, rounds, addCollectedReal]
  );

  const continueAfterReveal = useCallback(async () => {
    if (phase.kind !== "reveal" && phase.kind !== "wrongReveal") return;
    const strikes = phase.strikes;
    const streak = phase.streak;
    const score = phase.score;

    // Three strikes = game over.
    if (phase.kind === "wrongReveal" && strikes >= MAX_STRIKES) {
      setPhase({
        kind: "gameover",
        streak,
        score,
        losingRound: phase.losingRound,
        pickedIdx: phase.pickedIdx,
      });
      return;
    }

    const nextIndex = phase.index + 1;
    if (nextIndex >= rounds.length) {
      // Ran out of rounds — fetch a fresh batch and keep going.
      try {
        const res = await fetch("/api/headlines", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as HeadlinesResponse;
        if (data.rounds.length > 0) {
          setRounds(data.rounds);
          setPhase({ kind: "round", index: 0, streak, score, strikes });
          return;
        }
      } catch {
        // If fetch fails, end the game gracefully rather than crashing.
      }
      setPhase({ kind: "gameover", streak, score });
    } else {
      setPhase({ kind: "round", index: nextIndex, streak, score, strikes });
    }
  }, [phase, rounds.length]);

  const playAgain = useCallback(() => {
    // Skip the start screen — fetch new rounds and jump straight into the game.
    // The TOS checkbox is already acknowledged for this session.
    start();
  }, [start]);

  // Preload headlines once on mount so the first click is instant.
  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  if (phase.kind === "start") {
    return (
      <StartScreen
        displayName={displayName}
        onStart={start}
        loading={loading}
        error={error}
        onRetry={loadRounds}
      />
    );
  }

  if (phase.kind === "round") {
    const current = rounds[phase.index];
    return (
      <>
        <StreakBar
          streak={phase.streak}
          score={phase.score}
          strikes={phase.strikes}
          maxStrikes={MAX_STRIKES}
        />
        {current.kind === "normal" ? (
          <RoundScreen round={current} onAnswer={answerNormal} />
        ) : current.kind === "bonus" ? (
          <BonusRoundScreen round={current} onAnswer={answerBonus} />
        ) : (
          <BlankRoundScreen round={current} onAnswer={answerBlank} />
        )}
      </>
    );
  }

  if (phase.kind === "reveal") {
    return (
      <>
        <StreakBar
          streak={phase.streak}
          score={phase.score}
          strikes={phase.strikes}
          maxStrikes={MAX_STRIKES}
        />
        <RevealScreen
          round={rounds[phase.index]}
          correct={true}
          onContinue={continueAfterReveal}
        />
      </>
    );
  }

  if (phase.kind === "wrongReveal") {
    return (
      <>
        <StreakBar
          streak={phase.streak}
          score={phase.score}
          strikes={phase.strikes}
          maxStrikes={MAX_STRIKES}
        />
        <WrongScreen kind={phase.wrongKind} onContinue={continueAfterReveal} />
      </>
    );
  }

  return (
    <GameOverScreen
      score={phase.score}
      streak={phase.streak}
      roundsPlayed={rounds.length}
      displayName={displayName}
      losingRound={phase.losingRound}
      pickedIdx={phase.pickedIdx}
      onPlayAgain={playAgain}
    />
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import Newspaper from "./Newspaper";

type Props = {
  headline: string;
  styleKey: string;
  onAnswer: (guessReal: boolean) => void;
};

const THRESHOLD_RATIO = 0.3;
const MAX_TILT = 15;
const FLY_OFF_MS = 200;
const GAP_MS = 100;

type SwipeState =
  | { phase: "idle" }
  | { phase: "dragging"; startX: number; dx: number }
  | { phase: "flying"; direction: "left" | "right" };

export default function SwipeableNewspaper({ headline, styleKey, onAnswer }: Props) {
  const [swipe, setSwipe] = useState<SwipeState>({ phase: "idle" });
  const containerRef = useRef<HTMLDivElement>(null);
  const answered = useRef(false);

  const threshold =
    typeof window !== "undefined" ? window.innerWidth * THRESHOLD_RATIO : 150;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (answered.current) return;
    const touch = e.touches[0];
    setSwipe({ phase: "dragging", startX: touch.clientX, dx: 0 });
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (swipe.phase !== "dragging") return;
      const touch = e.touches[0];
      const dx = touch.clientX - swipe.startX;
      setSwipe({ ...swipe, dx });
    },
    [swipe]
  );

  const onTouchEnd = useCallback(() => {
    if (swipe.phase !== "dragging") return;
    if (answered.current) return;

    if (Math.abs(swipe.dx) >= threshold) {
      answered.current = true;
      const direction = swipe.dx > 0 ? "right" : "left";
      setSwipe({ phase: "flying", direction });

      setTimeout(() => {
        onAnswer(direction === "right");
      }, FLY_OFF_MS + GAP_MS);
    } else {
      setSwipe({ phase: "idle" });
    }
  }, [swipe, threshold, onAnswer]);

  // Compute newspaper transform
  let transform = "";
  let opacity = 1;
  let transition = "";

  if (swipe.phase === "dragging") {
    const tilt = Math.min(MAX_TILT, Math.max(-MAX_TILT, swipe.dx * 0.05));
    // Move slightly upward as you drag horizontally — follows the arrow curve
    const dy = -Math.abs(swipe.dx) * 0.15;
    transform = `translateX(${swipe.dx}px) translateY(${dy}px) rotate(${tilt}deg)`;
    transition = "none";
  } else if (swipe.phase === "flying") {
    const flyX = swipe.direction === "right" ? window.innerWidth + 100 : -window.innerWidth - 100;
    const flyY = -150; // fly diagonally upward
    const flyTilt = swipe.direction === "right" ? MAX_TILT : -MAX_TILT;
    transform = `translateX(${flyX}px) translateY(${flyY}px) rotate(${flyTilt}deg)`;
    opacity = 0;
    transition = `transform ${FLY_OFF_MS}ms ease-in, opacity ${FLY_OFF_MS}ms ease-in`;
  } else {
    transform = "translateX(0) translateY(0) rotate(0)";
    transition = "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)";
  }

  // Arrow animation based on swipe
  const dragRatio = swipe.phase === "dragging" ? swipe.dx / threshold : 0;
  const isFlying = swipe.phase === "flying";
  const flyDir = isFlying ? swipe.direction : null;

  // Arrow animations — respond instantly to any drag movement (no threshold delay)
  const absDrag = Math.abs(dragRatio);

  // Fake arrow (left): fades when swiping right, moves when swiping left
  const fakeArrowOpacity = isFlying
    ? 0
    : dragRatio > 0 ? Math.max(0, 1 - absDrag * 1.5) : 1;
  const fakeArrowTranslate = isFlying && flyDir === "left"
    ? "translateX(-100px) translateY(-60px)"
    : dragRatio < 0
      ? `translateX(${dragRatio * 30}px) translateY(${dragRatio * 15}px)`
      : "translateX(0) translateY(0)";

  // Real arrow (right): fades when swiping left, moves when swiping right
  const realArrowOpacity = isFlying
    ? 0
    : dragRatio < 0 ? Math.max(0, 1 - absDrag * 1.5) : 1;
  const realArrowTranslate = isFlying && flyDir === "right"
    ? "translateX(100px) translateY(-60px)"
    : dragRatio > 0
      ? `translateX(${dragRatio * 30}px) translateY(${-dragRatio * 15}px)`
      : "translateX(0) translateY(0)";

  return (
    <div
      ref={containerRef}
      className="relative flex w-full flex-1 items-center justify-center"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* FAKE arrow — bottom-left */}
      <div
        className="pointer-events-none absolute -left-6 bottom-0 z-10"
        style={{
          opacity: fakeArrowOpacity,
          transform: fakeArrowTranslate,
          transition: isFlying ? "all 200ms ease-in" : "none",
        }}
      >
        <svg
          width="200"
          height="170"
          viewBox="-30 -30 230 200"
          fill="none"
          overflow="visible"
        >
          <path
            d="M170 160 C170 95 130 60 80 50"
            stroke="rgba(244,63,94,0.5)"
            strokeWidth="80"
            strokeLinecap="square"
            fill="none"
          />
          <polygon
            points="-25,38 100,-35 100,115"
            fill="rgba(244,63,94,1)"
          />
          <defs>
            <path id="fakeText" d="M95 63 C125 73 150 95 165 155" />
          </defs>
          <text
            fill="rgba(0,0,0,0.85)"
            fontSize="32"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            letterSpacing="5"
          >
            <textPath href="#fakeText" startOffset="0%">
              FAKE
            </textPath>
          </text>
        </svg>
      </div>

      {/* REAL arrow — bottom-right */}
      <div
        className="pointer-events-none absolute -right-6 bottom-0 z-10"
        style={{
          opacity: realArrowOpacity,
          transform: realArrowTranslate,
          transition: isFlying ? "all 200ms ease-in" : "none",
        }}
      >
        <svg
          width="200"
          height="170"
          viewBox="-10 -30 230 200"
          fill="none"
          overflow="visible"
        >
          <path
            d="M20 160 C20 95 60 60 110 50"
            stroke="rgba(16,185,129,0.5)"
            strokeWidth="80"
            strokeLinecap="square"
            fill="none"
          />
          <polygon
            points="215,38 90,-35 90,115"
            fill="rgba(16,185,129,1)"
          />
          <defs>
            <path id="realText" d="M25 155 C40 95 65 73 95 63" />
          </defs>
          <text
            fill="rgba(0,0,0,0.85)"
            fontSize="32"
            fontWeight="900"
            fontFamily="system-ui, sans-serif"
            letterSpacing="5"
          >
            <textPath href="#realText" startOffset="0%">
              REAL
            </textPath>
          </text>
        </svg>
      </div>

      {/* The newspaper card */}
      <div
        className="w-full touch-none"
        style={{ transform, opacity, transition, willChange: "transform" }}
      >
        <Newspaper headline={headline} styleKey={styleKey} />
      </div>
    </div>
  );
}

"use client";

import { forwardRef, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { Taunt } from "@/lib/taunts";

type Props = {
  score: number;
  taunt?: Taunt;
  sourceUrl?: string;
  correctAnswer?: string; // shown for bonus/blank wrong answers
};

const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { score, taunt, sourceUrl, correctAnswer },
  ref
) {
  const internalRef = useRef<HTMLDivElement>(null);
  const cardEl = (ref as React.RefObject<HTMLDivElement | null>) ?? internalRef;
  const [status, setStatus] = useState<"idle" | "pending">("idle");

  const shareText = `Just scored a ${score} on the Real or Fake News game! Getting better at spotting misinformation... 🔥`;
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://real-or-fake-news.app";

  async function downloadImage() {
    if (!cardEl.current) return;
    setStatus("pending");
    try {
      const dataUrl = await toPng(cardEl.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#e5e5e5",
      });
      const link = document.createElement("a");
      link.download = "real-or-fake-news.png";
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { /* ignore */ }
    setStatus("idle");
  }

  function openTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=550,height=420");
  }

  function openFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "width=550,height=420");
  }

  function openLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=550,height=420");
  }

  return (
    <div
      ref={cardEl}
      className="relative mx-auto w-full max-w-sm overflow-hidden bg-neutral-200 px-6 py-6 text-neutral-900 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.6)]"
    >
      {/* Taunt quote — large, black, card header */}
      {taunt && (
        <p className="text-center font-serif text-xl font-black leading-tight text-neutral-900 sm:text-2xl">
          &ldquo;{taunt.line}&rdquo;
        </p>
      )}

      {/* Correct answer (bonus/blank rounds) */}
      {correctAnswer && (
        <div className="mt-2 text-center">
          <p className="font-serif text-[9px] uppercase tracking-[0.2em] text-neutral-500">
            Correct Answer
          </p>
          <p className="mt-0.5 font-serif text-base font-black text-neutral-900 sm:text-lg">
            {correctAnswer}
          </p>
        </div>
      )}

      {/* Source link — light blue hyperlink */}
      {sourceUrl && (
        <p className="mt-2 text-center">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-serif text-[11px] font-bold uppercase tracking-widest text-sky-500 underline underline-offset-2 hover:text-sky-400"
          >
            Read the source →
          </a>
        </p>
      )}

      {/* First rule */}
      <div className="mx-auto my-4 h-px w-2/3 bg-neutral-500" />

      {/* Score — centered */}
      <div className="flex flex-col items-center">
        <p className="font-serif text-sm font-black uppercase tracking-[0.2em] text-neutral-900">
          Final Score
        </p>
        <p className="mt-1 font-serif text-7xl font-black leading-none tabular-nums text-emerald-600 sm:text-8xl">
          {score}
        </p>
      </div>


      {/* Second rule */}
      <div className="mx-auto my-4 h-px w-2/3 bg-neutral-500" />

      {/* Share buttons */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={openTwitter}
            title="Share on X / Twitter"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-400 bg-neutral-300 text-sm font-black text-neutral-700 transition-colors hover:bg-neutral-400"
          >
            𝕏
          </button>
          <button
            onClick={openFacebook}
            title="Share on Facebook"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-400 bg-neutral-300 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-400"
          >
            f
          </button>
          <button
            onClick={openLinkedIn}
            title="Share on LinkedIn"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-400 bg-neutral-300 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-400"
          >
            in
          </button>
          <button
            onClick={downloadImage}
            disabled={status === "pending"}
            title="Download score card image"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-400 bg-neutral-300 text-sm text-neutral-700 transition-colors hover:bg-neutral-400 disabled:opacity-50"
          >
            ↓
          </button>
        </div>
        <p className="text-[9px] uppercase tracking-widest text-neutral-500">
          Share your score
        </p>
      </div>
    </div>
  );
});

export default ShareCard;

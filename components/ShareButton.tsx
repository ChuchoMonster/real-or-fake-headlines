"use client";

import { useState, type RefObject } from "react";
import { toPng } from "html-to-image";

type Props = {
  cardRef: RefObject<HTMLDivElement | null>;
  score: number;
  streak: number;
};

type Status =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

export default function ShareButton({ cardRef, score, streak }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function share() {
    if (!cardRef.current) return;
    setStatus({ kind: "pending" });

    try {
      // Capture the share card DOM as a high-DPI PNG data URL.
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#fafaf9",
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "real-or-fake-news.png", {
        type: "image/png",
      });

      const text = `I scored ${score} points on Real or Fake News with a ${streak}-streak 🔥 — can you beat me?`;
      const shareData: ShareData = {
        title: "Real or Fake News",
        text,
      };

      // Preferred path: native share sheet with the image file attached.
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ ...shareData, files: [file] });
        setStatus({ kind: "done", message: "Shared!" });
        return;
      }

      // Next best: native share sheet with text/title only.
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        setStatus({ kind: "done", message: "Shared!" });
        return;
      }

      // Fallback: download the PNG, copy the caption to clipboard.
      const link = document.createElement("a");
      link.download = "real-or-fake-news.png";
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      try {
        await navigator.clipboard.writeText(text);
        setStatus({
          kind: "done",
          message: "Image downloaded. Caption copied to clipboard.",
        });
      } catch {
        setStatus({ kind: "done", message: "Image downloaded." });
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // User cancelled the native share sheet — treat as benign.
        setStatus({ kind: "idle" });
        return;
      }
      console.error("[share]", e);
      setStatus({
        kind: "error",
        message: "Couldn't share. Try a screenshot instead.",
      });
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={share}
        disabled={status.kind === "pending"}
        className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-8 py-3 text-sm font-black uppercase tracking-[0.2em] text-neutral-100 transition-colors hover:border-amber-400 hover:text-amber-400 disabled:opacity-50"
      >
        <span className="text-base">↗</span>
        {status.kind === "pending" ? "Preparing…" : "Share Score"}
      </button>
      {(status.kind === "done" || status.kind === "error") && (
        <p
          className={`text-xs ${
            status.kind === "error" ? "text-rose-400" : "text-emerald-400"
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}

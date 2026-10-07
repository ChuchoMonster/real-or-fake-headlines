"use client";

import { useMemo } from "react";

// 6 newspaper layout variants. All share the same grayscale palette
// (#e8e8e8 bg, black text, sky-500 date strip, sky-blue accent columns)
// but vary in structure: image position, column count, image count, etc.

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function headlineSize(headline: string): string {
  const len = headline.length;
  if (len < 30) return "text-4xl sm:text-5xl leading-[0.95]";
  if (len < 50) return "text-3xl sm:text-4xl leading-[1.0]";
  if (len < 75) return "text-2xl sm:text-3xl leading-[1.05]";
  if (len < 100) return "text-xl sm:text-2xl leading-[1.1]";
  return "text-lg sm:text-xl leading-snug";
}

function FakeLines({ count = 8, color = "bg-neutral-500/60" }: { count?: number; color?: string }) {
  const widths = [92, 78, 85, 95, 70, 88, 80, 93, 75, 82];
  return (
    <div className="space-y-[3px]">
      {widths.slice(0, count).map((w, i) => (
        <div key={i} className={`h-[2px] ${color}`} style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

function ThreeColumns() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <FakeLines color="bg-sky-400/40" />
      <FakeLines color="bg-neutral-500/60" />
      <FakeLines color="bg-sky-400/40" />
    </div>
  );
}

function ImageBlock({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const h = size === "sm" ? "h-14 sm:h-16" : size === "lg" ? "h-24 sm:h-28" : "h-20 sm:h-24";
  return (
    <div className={`flex w-full items-center justify-center bg-neutral-400/40 ${h}`}>
      <div className="h-10 w-10 rounded-full bg-neutral-500/40 sm:h-12 sm:w-12" />
    </div>
  );
}

function DateStrip({ date }: { date: string }) {
  return (
    <div className="mx-auto w-fit bg-sky-500 px-4 py-0.5">
      <p className="font-serif text-[9px] uppercase tracking-widest text-white">
        {date} · Daily Edition
      </p>
    </div>
  );
}

function Masthead({ date }: { date: string }) {
  return (
    <div className="border-b border-neutral-700 pb-3 text-center">
      <div className="border-b border-neutral-500 pb-2">
        <h2 className="font-serif text-xl font-black uppercase tracking-wide text-neutral-900 sm:text-2xl">
          The Newsmongers
        </h2>
      </div>
      <div className="mt-2">
        <DateStrip date={date} />
      </div>
    </div>
  );
}

// ─── LAYOUT 1: Classic — image below headline, 3 columns at bottom ───
function Layout1({ headline, date }: { headline: string; date: string }) {
  return (
    <div className="px-6 pb-5 pt-4 sm:px-8">
      <Masthead date={date} />
      <div className="border-b border-neutral-500 py-6 sm:py-8">
        <h1 className={`text-center font-serif font-black uppercase text-neutral-900 ${headlineSize(headline)}`}>
          {headline}
        </h1>
      </div>
      <div className="mx-auto my-5 w-2/3">
        <ImageBlock />
      </div>
      <ThreeColumns />
    </div>
  );
}

// ─── LAYOUT 2: Image LEFT, headline + text RIGHT ───
function Layout2({ headline, date }: { headline: string; date: string }) {
  return (
    <div className="px-6 pb-5 pt-4 sm:px-8">
      <Masthead date={date} />
      <div className="mt-5 flex gap-4">
        <div className="w-2/5 shrink-0">
          <ImageBlock size="lg" />
          <div className="mt-3">
            <FakeLines count={6} color="bg-sky-400/40" />
          </div>
        </div>
        <div className="flex-1">
          <h1 className={`font-serif font-black uppercase text-neutral-900 ${headlineSize(headline)}`}>
            {headline}
          </h1>
          <div className="mt-4">
            <FakeLines count={10} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT 3: Two images side by side below headline ───
function Layout3({ headline, date }: { headline: string; date: string }) {
  return (
    <div className="px-6 pb-5 pt-4 sm:px-8">
      <Masthead date={date} />
      <div className="border-b border-neutral-500 py-6 sm:py-8">
        <h1 className={`text-center font-serif font-black uppercase text-neutral-900 ${headlineSize(headline)}`}>
          {headline}
        </h1>
      </div>
      <div className="my-4 flex gap-3">
        <div className="flex-1">
          <ImageBlock size="sm" />
        </div>
        <div className="flex-1">
          <ImageBlock size="sm" />
        </div>
      </div>
      <ThreeColumns />
    </div>
  );
}

// ─── LAYOUT 4: Full-width headline, image RIGHT with text wrapping left ───
function Layout4({ headline, date }: { headline: string; date: string }) {
  return (
    <div className="px-6 pb-5 pt-4 sm:px-8">
      <Masthead date={date} />
      <div className="border-b border-neutral-500 py-6 sm:py-8">
        <h1 className={`text-center font-serif font-black uppercase text-neutral-900 ${headlineSize(headline)}`}>
          {headline}
        </h1>
      </div>
      <div className="mt-5 flex gap-4">
        <div className="flex-1">
          <FakeLines count={10} color="bg-sky-400/40" />
        </div>
        <div className="w-2/5 shrink-0">
          <ImageBlock size="lg" />
          <div className="mt-3">
            <FakeLines count={5} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT 5: Headline spanning full width, two columns below with image in left column ───
function Layout5({ headline, date }: { headline: string; date: string }) {
  return (
    <div className="px-6 pb-5 pt-4 sm:px-8">
      <Masthead date={date} />
      <div className="border-b border-neutral-500 py-6 sm:py-8">
        <h1 className={`text-center font-serif font-black uppercase text-neutral-900 ${headlineSize(headline)}`}>
          {headline}
        </h1>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <ImageBlock size="md" />
          <div className="mt-3">
            <FakeLines count={6} color="bg-sky-400/40" />
          </div>
        </div>
        <div>
          <FakeLines count={12} />
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT 6: Big image top, headline below, two narrow columns at bottom ───
function Layout6({ headline, date }: { headline: string; date: string }) {
  return (
    <div className="px-6 pb-5 pt-4 sm:px-8">
      <Masthead date={date} />
      <div className="mx-auto mt-4 w-full">
        <ImageBlock size="lg" />
      </div>
      <div className="border-b border-neutral-500 py-5 sm:py-6">
        <h1 className={`text-center font-serif font-black uppercase text-neutral-900 ${headlineSize(headline)}`}>
          {headline}
        </h1>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <FakeLines count={8} color="bg-sky-400/40" />
        <FakeLines count={8} />
      </div>
    </div>
  );
}

const LAYOUTS = [Layout1, Layout2, Layout3, Layout4, Layout5, Layout6];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

type NewspaperProps = {
  headline: string;
  styleKey: string;
  className?: string;
};

export default function Newspaper({ headline, styleKey, className = "" }: NewspaperProps) {
  const layoutIdx = useMemo(() => hashString(styleKey) % LAYOUTS.length, [styleKey]);
  const date = useMemo(formatDate, []);
  const LayoutComponent = LAYOUTS[layoutIdx];

  return (
    <div
      className={`relative mx-auto w-full max-w-xl animate-newspaper-spin overflow-hidden border-2 border-neutral-700 bg-[#e8e8e8] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] ${className}`}
      style={{ transformOrigin: "center center" }}
    >
      <LayoutComponent headline={headline} date={date} />
    </div>
  );
}

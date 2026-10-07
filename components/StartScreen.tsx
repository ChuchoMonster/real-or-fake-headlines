"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { validateDisplayName } from "@/lib/auth/validateDisplayName";

type Props = {
  displayName: string | null;
  onStart: () => void;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
};

type AuthTab = "signup" | "signin";

const BLUE = "bg-sky-500";
const BLUE_HOVER = "hover:bg-sky-400";

export default function StartScreen({
  displayName,
  onStart,
  loading,
  error,
  onRetry,
}: Props) {
  const [accepted, setAccepted] = useState(false);
  const isSignedIn = !!displayName;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-5xl overflow-hidden border-2 border-neutral-700 bg-[#e8e8e8] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        {/* Title */}
        <div className="border-b border-neutral-700 px-6 pb-3 pt-5 text-center sm:px-8">
          <h1 className="font-serif text-4xl font-black uppercase tracking-tight text-neutral-900 sm:text-6xl">
            Real or Fake News?
          </h1>
          <div className="mx-auto mt-3 w-fit bg-sky-500 px-6 py-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-white sm:text-sm">
              {today}
            </p>
          </div>
        </div>

        {/* Tagline — full width */}
        <div className="border-b border-neutral-500 px-6 py-3 sm:px-12 sm:py-4">
          <p className="text-center font-serif text-sm leading-snug text-neutral-600 sm:text-base">
            In a world full of noise, can you spot the signal?
          </p>
        </div>

        {/* Mobile: full-width. Desktop: two-column */}
        <div className="flex border-b border-neutral-500">
          {/* Left column — desktop only */}
          <div className="hidden flex-1 flex-col justify-center border-r border-neutral-500 px-12 py-10 md:flex">
            <p className="font-serif text-xl leading-snug text-neutral-900">
              In a world full of noise, can you spot the signal?
            </p>
          </div>

          {/* Auth or game start */}
          <div className="flex w-full flex-col items-center justify-center px-6 py-6 sm:px-12 sm:py-10 md:flex-1">
            {isSignedIn ? (
              <SignedInColumn
                displayName={displayName}
                accepted={accepted}
                setAccepted={setAccepted}
                onStart={onStart}
                loading={loading}
                error={error}
                onRetry={onRetry}
              />
            ) : (
              <AuthColumn />
            )}
          </div>
        </div>

        {/* Fake body columns */}
        <div className="px-8 py-4 sm:px-12">
          <FakeColumns />
        </div>
      </div>
    </div>
  );
}

function FakeColumns() {
  const widths = [92, 78, 85, 95, 70, 88, 80, 93];
  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((col) => (
        <div key={col} className="space-y-[3px]">
          {widths.map((w, i) => (
            <div
              key={i}
              className="h-[2px] bg-neutral-500/50"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function SignedInColumn({
  displayName,
  accepted,
  setAccepted,
  onStart,
  loading,
  error,
  onRetry,
}: {
  displayName: string;
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  onStart: () => void;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="font-serif text-sm text-neutral-600">
        Welcome back,{" "}
        <span className="font-black text-neutral-900">{displayName}</span>
      </p>

      <button
        onClick={onStart}
        disabled={loading || !accepted}
        className={`w-full ${BLUE} px-6 py-5 font-serif text-xl font-black uppercase tracking-wider text-white transition-all ${BLUE_HOVER} active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30 sm:text-2xl`}
      >
        {loading ? "Loading…" : "Start Game"}
      </button>

      {error && (
        <div className="flex flex-col items-center gap-1">
          <p className="font-serif text-[10px] text-neutral-600">
            Couldn't load headlines
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="font-serif text-[10px] font-bold text-neutral-600 underline underline-offset-2"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-2 text-left text-[10px] leading-snug text-neutral-600">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-sky-500"
        />
        <span className="font-serif">
          I understand this is for{" "}
          <strong className="text-neutral-900">entertainment only</strong>,
          that some headlines are AI-generated, and I agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            className="text-neutral-900 underline underline-offset-2"
          >
            Terms
          </Link>
          .
        </span>
      </label>
    </div>
  );
}

function AuthColumn() {
  const [tab, setTab] = useState<AuthTab>("signup");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  function switchTab(t: AuthTab) {
    setTab(t);
    setFormError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!email.trim()) {
      setFormError("Email is required.");
      return;
    }
    if (!password || password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }

    if (tab === "signup") {
      const check = validateDisplayName(displayNameInput);
      if (!check.ok) {
        setFormError(check.reason);
        return;
      }
      if (!tosAccepted) {
        setFormError("Please agree to the Terms of Service.");
        return;
      }
    }

    startTransition(async () => {
      const endpoint =
        tab === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const payload =
        tab === "signup"
          ? { email: email.trim(), password, displayName: displayNameInput.trim() }
          : { email: email.trim(), password };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error ?? "Something went wrong.");
          return;
        }
        // Server set the session cookie — navigate to reload with session
        window.location.href = "/";
      } catch {
        setFormError("Network error. Please try again.");
      }
    });
  }

  if (success) {
    return (
      <div className="flex w-full flex-col items-center gap-3 py-4 text-center">
        <p className="font-serif text-lg font-black text-neutral-900">
          You're in! Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Tabs */}
      <div className="flex gap-0 border border-neutral-500">
        <button
          onClick={() => switchTab("signup")}
          className={`flex-1 py-2 font-serif text-xs font-bold uppercase tracking-widest transition-colors ${
            tab === "signup"
              ? "bg-neutral-900 text-white"
              : "bg-[#e8e8e8] text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Sign Up
        </button>
        <button
          onClick={() => switchTab("signin")}
          className={`flex-1 border-l border-neutral-500 py-2 font-serif text-xs font-bold uppercase tracking-widest transition-colors ${
            tab === "signin"
              ? "bg-neutral-900 text-white"
              : "bg-[#e8e8e8] text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Sign In
        </button>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="flex flex-col gap-2.5">
        {tab === "signup" && (
          <input
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            maxLength={20}
            placeholder="Display name"
            className="w-full border border-neutral-500 bg-white px-3 py-2.5 font-serif text-sm font-bold text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border border-neutral-500 bg-white px-3 py-2.5 font-serif text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={tab === "signup" ? "Create password (6+ chars)" : "Password"}
          className="w-full border border-neutral-500 bg-white px-3 py-2.5 font-serif text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900"
        />

        {tab === "signup" && (
          <label className="flex cursor-pointer items-start gap-2 text-left text-[10px] leading-snug text-neutral-600">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-neutral-900"
            />
            <span className="font-serif">
              I understand this is for{" "}
              <strong className="text-neutral-900">entertainment only</strong>,
              that some headlines are AI-generated, and I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-neutral-900 underline underline-offset-2"
              >
                Terms
              </Link>
              .
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-neutral-900 px-4 py-3 font-serif text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-neutral-800 active:scale-[0.97] disabled:opacity-50"
        >
          {pending
            ? tab === "signup"
              ? "Creating account…"
              : "Signing in…"
            : tab === "signup"
              ? "Create Account"
              : "Sign In"}
        </button>

        {formError && (
          <p className="font-serif text-xs text-red-700">{formError}</p>
        )}
      </form>

      <p className="text-center font-serif text-[10px] text-neutral-500">
        {tab === "signup"
          ? "Already have an account? Use the Sign In tab."
          : "No account? Use the Sign Up tab to create one."}
      </p>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateDisplayName } from "@/lib/auth/validateDisplayName";

type Props = {
  initialDisplayName: string;
  email: string;
};

export default function SettingsClient({ initialDisplayName, email }: Props) {
  const [name, setName] = useState(initialDisplayName);
  const [nameMsg, setNameMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );
  const [namePending, startNameSave] = useTransition();

  const [signOutPending, startSignOut] = useTransition();
  const [deleteStage, setDeleteStage] = useState<"idle" | "confirming" | "running">(
    "idle"
  );
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const router = useRouter();

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    const check = validateDisplayName(name);
    if (!check.ok) {
      setNameMsg({ kind: "err", text: check.reason });
      return;
    }
    if (check.value === initialDisplayName) {
      setNameMsg({ kind: "ok", text: "No change." });
      return;
    }
    startNameSave(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: check.value })
        .eq("user_id", user.id);
      if (error) {
        setNameMsg({
          kind: "err",
          text:
            error.code === "23505"
              ? "That name's taken. Try another."
              : error.message,
        });
        return;
      }
      setNameMsg({ kind: "ok", text: "Saved." });
      router.refresh();
    });
  }

  function signOutEverywhere() {
    startSignOut(async () => {
      const supabase = createClient();
      // `global` scope revokes every refresh token for this user on every device.
      await supabase.auth.signOut({ scope: "global" });
      router.replace("/");
      router.refresh();
    });
  }

  async function deleteAccount() {
    setDeleteStage("running");
    setDeleteMsg(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      // Session will be gone server-side; force a full refresh.
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setDeleteStage("idle");
      setDeleteMsg(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Display name */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="text-lg font-black">Display name</h2>
        <p className="mt-1 text-xs text-neutral-500">
          How you appear on leaderboards. 3–20 characters.
        </p>
        <form onSubmit={saveName} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3 font-bold outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={namePending}
            className="rounded-lg bg-amber-400 px-6 py-3 text-sm font-black uppercase tracking-wider text-neutral-950 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {namePending ? "Saving…" : "Save"}
          </button>
        </form>
        {nameMsg && (
          <p
            className={`mt-2 text-sm ${
              nameMsg.kind === "ok" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {nameMsg.text}
          </p>
        )}
      </section>

      {/* Sign out everywhere */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h2 className="text-lg font-black">Sign out everywhere</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Signs {email || "your account"} out of every device and browser. You'll need to
          request a new magic link to sign back in.
        </p>
        <button
          onClick={signOutEverywhere}
          disabled={signOutPending}
          className="mt-4 rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-sm font-bold text-neutral-200 transition-colors hover:border-amber-400 hover:text-amber-400 disabled:opacity-50"
        >
          {signOutPending ? "Signing out…" : "Sign out everywhere"}
        </button>
      </section>

      {/* Delete account */}
      <section className="rounded-2xl border border-rose-900/50 bg-rose-950/20 p-5">
        <h2 className="text-lg font-black text-rose-400">Delete account</h2>
        <p className="mt-1 text-xs text-rose-300/70">
          Permanently deletes your account, display name, and every score you've ever saved.
          This cannot be undone.
        </p>

        {deleteStage === "idle" && (
          <button
            onClick={() => setDeleteStage("confirming")}
            className="mt-4 rounded-lg border border-rose-700 bg-rose-950/40 px-5 py-2.5 text-sm font-bold text-rose-300 transition-colors hover:bg-rose-950/60"
          >
            Delete my account
          </button>
        )}

        {deleteStage === "confirming" && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm font-bold text-rose-300">
              Are you absolutely sure? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={deleteAccount}
                className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-white hover:bg-rose-500"
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setDeleteStage("idle")}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-sm font-bold text-neutral-200 hover:border-neutral-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteStage === "running" && (
          <p className="mt-4 text-sm text-rose-300">Deleting…</p>
        )}

        {deleteMsg && <p className="mt-3 text-sm text-rose-400">{deleteMsg}</p>}
      </section>
    </div>
  );
}

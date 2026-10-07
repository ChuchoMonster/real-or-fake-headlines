import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import SettingsClient from "./SettingsClient";

export const metadata = { title: "Settings — Real or Fake News" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.profile) redirect("/onboarding");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-6 py-12">
      <Link
        href="/"
        className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-500 hover:text-amber-400"
      >
        ← Back to game
      </Link>

      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
          Account
        </p>
        <h1 className="mt-2 text-4xl font-black">Settings</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Signed in as{" "}
          <span className="text-neutral-300">{user.email ?? "(no email)"}</span>
        </p>
      </header>

      <SettingsClient
        initialDisplayName={user.profile.display_name}
        email={user.email ?? ""}
      />
    </main>
  );
}

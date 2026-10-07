import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import OnboardingForm from "./OnboardingForm";

export const metadata = { title: "Pick a name — Real or Fake News" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.profile) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-8 px-6">
      <div className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
          One last thing
        </p>
        <h1 className="text-3xl font-black">Pick a name</h1>
        <p className="mt-2 text-sm text-neutral-400">
          This is how you'll appear on the leaderboard. 3–20 characters. You can change it later.
        </p>
        <OnboardingForm />
      </div>
    </main>
  );
}

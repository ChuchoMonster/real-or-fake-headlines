import SignInForm from "./SignInForm";
import Link from "next/link";

export const metadata = { title: "Sign in — Real or Fake News" };

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  return <SignInPageInner searchParams={searchParams} />;
}

async function SignInPageInner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-8 px-6">
      <Link
        href="/"
        className="font-serif text-xs font-bold uppercase tracking-[0.3em] text-neutral-500 hover:text-neutral-900"
      >
        ← Back to game
      </Link>

      <div className="w-full overflow-hidden border-2 border-neutral-700 bg-[#e8e8e8] p-6">
        {/* Title */}
        <div className="border-b border-neutral-500 pb-2 text-center">
          <h2 className="font-serif text-lg font-black uppercase tracking-wide text-neutral-900">
            Real or Fake News?
          </h2>
        </div>

        <div className="mt-4">
          <h1 className="font-serif text-3xl font-black uppercase text-neutral-900">
            Sign in
          </h1>
          <p className="mt-2 font-serif text-sm text-neutral-600">
            Enter your email and we'll send you a magic link — no password
            needed. If you're new, this creates your account automatically. If
            you already have one, it signs you in. One click and you're in.
          </p>
        </div>

        {sent ? (
          <div className="mt-6 border border-emerald-600/40 bg-emerald-100 p-4 font-serif text-sm text-emerald-800">
            ✉️ Check your email for the magic link. You can close this tab.
          </div>
        ) : (
          <SignInForm />
        )}

        {error && (
          <p className="mt-3 font-serif text-sm text-red-700">
            {error === "missing_code"
              ? "Sign-in link was invalid or expired."
              : error}
          </p>
        )}
      </div>
    </main>
  );
}

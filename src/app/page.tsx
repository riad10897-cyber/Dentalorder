import { redirect } from "next/navigation";
import { homeForUser } from "@/lib/supabase/home";
import { getVerifiedUserId } from "@/lib/supabase/auth";


export default async function LandingPage() {
  const userId = await getVerifiedUserId();

  if (userId) {
    redirect(await homeForUser(userId));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <h1 className="font-display text-figure text-ink">Dentora</h1>
      <p className="text-body text-ink-muted">
        Weekly tooth ordering and dental supplies for students in Lebanon.
      </p>
      <div className="flex w-full flex-col gap-3">
        <a
          href="/sign-up"
          className="pressable flex min-h-11 items-center justify-center rounded-control bg-ink px-4 py-3 font-display text-body text-card"
        >
          Create an account
        </a>
        <a
          href="/sign-in"
          className="pressable flex min-h-11 items-center justify-center rounded-control border border-rule bg-card px-4 py-3 font-display text-body text-ink"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}

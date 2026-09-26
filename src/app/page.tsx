import { redirect } from "next/navigation";
import { homeForUser } from "@/lib/supabase/home";
import { getVerifiedUserId } from "@/lib/supabase/auth";


export default async function LandingPage() {
  const userId = await getVerifiedUserId();

  if (userId) {
    redirect(await homeForUser(userId));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <h1 className="font-display text-3xl font-bold text-ink">Dentora</h1>
      <p className="text-sm text-ink-muted">
        Weekly tooth ordering and dental supplies for students in Lebanon.
      </p>
      <div className="flex w-full flex-col gap-3">
        <a
          href="/sign-up"
          className="min-h-11 rounded-sm bg-ink px-4 py-3 text-center font-semibold text-card"
        >
          Create an account
        </a>
        <a
          href="/sign-in"
          className="min-h-11 rounded-sm border border-rule px-4 py-3 text-center text-ink"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}

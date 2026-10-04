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
      <h1 className="text-[2.75rem] font-bold leading-none tracking-[-0.03em] text-ink">Molaro</h1>
      <p className="text-native-body text-ink-muted">
        Dental ordering made easy.
      </p>
      <div className="flex w-full flex-col gap-3">
        <a
          href="/sign-up"
          className="flex h-[3.125rem] items-center justify-center rounded-button bg-ink px-4 text-native-body font-semibold text-card transition-transform duration-[120ms] ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:active:scale-100"
        >
          Create an account
        </a>
        <a
          href="/sign-in"
          className="flex h-[3.125rem] items-center justify-center rounded-button bg-fill px-4 text-native-body font-semibold text-ink transition-transform duration-[120ms] ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:active:scale-100"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}

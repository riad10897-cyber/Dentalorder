import { redirect } from "next/navigation";
import { homeForUser } from "@/lib/supabase/home";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { WelcomeHero } from "@/app/_components/welcome-hero";
import { Wordmark } from "@/app/_components/wordmark";


export default async function LandingPage() {
  const userId = await getVerifiedUserId();

  if (userId) {
    redirect(await homeForUser(userId));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <WelcomeHero />
      <h1 aria-label="Molaro" className="welcome-in" style={{ "--i": 0 } as React.CSSProperties}>
        <Wordmark size="3rem" />
      </h1>
      <p className="welcome-in text-native-body text-ink-muted" style={{ "--i": 1 } as React.CSSProperties}>
        Dental ordering made easy.
      </p>
      <div className="welcome-in flex w-full flex-col gap-3" style={{ "--i": 2 } as React.CSSProperties}>
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

import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div>
        <h1 className="font-display text-title text-ink">Sign in</h1>
        <p className="mt-1 text-small text-ink-muted">Welcome back to Molaro.</p>
      </div>
      <SignInForm />
      {/* No reset email yet: Supabase's built-in sender is rate-limited and
          lands in spam. Until a real email provider is set up, a person
          resets it for them. */}
      <details className="text-center text-small text-ink-muted">
        <summary className="pressable mx-auto inline-flex min-h-11 cursor-pointer list-none items-center underline underline-offset-4">
          Forgot your password?
        </summary>
        <p className="mt-1">Message Riad and he will set you a new one.</p>
      </details>
      <p className="text-center text-small text-ink-muted">
        Don&apos;t have an account?{" "}
        <a href="/sign-up" className="text-ink underline underline-offset-4">
          Create one
        </a>
      </p>
    </main>
  );
}

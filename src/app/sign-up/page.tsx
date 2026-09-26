
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage() {

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-title text-ink">Create your account</h1>
        <p className="mt-1 text-small text-ink-muted">
          Two short steps, then you can order.
        </p>
      </div>
      <SignUpForm />
      <p className="text-center text-small text-ink-muted">
        Already have an account?{" "}
        <a href="/sign-in" className="text-ink underline underline-offset-4">
          Sign in
        </a>
      </p>
    </main>
  );
}

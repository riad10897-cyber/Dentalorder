import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-text">Sign in</h1>
        <p className="mt-1 text-sm text-text-muted">Welcome back to DentalOrder.</p>
      </div>
      <SignInForm />
      <p className="text-center text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <a href="/sign-up" className="text-accent underline underline-offset-4">
          Create one
        </a>
      </p>
    </main>
  );
}

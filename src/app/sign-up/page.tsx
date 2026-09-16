import { getRepDirectory } from "@/lib/reps/directory";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage() {
  const reps = await getRepDirectory();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pick your role to get started with DentalOrder.
        </p>
      </div>
      <SignUpForm reps={reps} />
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <a href="/sign-in" className="text-ink underline underline-offset-4">
          Sign in
        </a>
      </p>
    </main>
  );
}

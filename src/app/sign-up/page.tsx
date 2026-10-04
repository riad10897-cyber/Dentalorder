
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage() {

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <h1 className="text-screen-title font-bold text-ink">Create your account</h1>
        <p className="mt-1 text-native-body text-ink-muted">
          Two short steps, then you can order.
        </p>
      </div>
      <div className="native-form">
        <SignUpForm />
      </div>
      <p className="text-center text-list-secondary text-ink-muted">
        Already have an account?{" "}
        <a href="/sign-in" className="text-ink underline underline-offset-4">
          Sign in
        </a>
      </p>
    </main>
  );
}

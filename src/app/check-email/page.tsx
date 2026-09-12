export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold text-text">Check your email</h1>
      <p className="text-sm text-text-muted">
        We sent you a confirmation link. Open it to finish creating your account, then come
        back and sign in.
      </p>
      <a href="/sign-in" className="text-accent underline underline-offset-4">
        Back to sign in
      </a>
    </main>
  );
}

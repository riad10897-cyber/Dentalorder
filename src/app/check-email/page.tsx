export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-5 py-10 text-center">
      <h1 className="text-screen-title font-bold text-ink">Check your email</h1>
      <p className="text-native-body text-ink-muted">
        We sent you a confirmation link. Open it to finish creating your account, then come
        back and sign in.
      </p>
      <a href="/sign-in" className="pressable inline-flex min-h-11 items-center text-small text-ink underline underline-offset-4">
        Back to sign in
      </a>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/actions/auth";

const initialState: FormState = { error: null, fieldErrors: {} };

const inputClass =
  "min-h-11 w-full rounded-control border border-rule bg-card px-3 py-2 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-small text-ink-muted">
        Email
        <input name="email" type="email" autoComplete="email" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-small text-ink-muted">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      {state.error && <p className="text-small text-ink" role="alert">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="pressable min-h-11 rounded-control bg-ink px-4 py-3 font-display text-body text-card disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

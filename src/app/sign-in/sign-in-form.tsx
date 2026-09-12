"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/actions/auth";

const initialState: FormState = { error: null, fieldErrors: {} };

const inputClass =
  "min-h-11 w-full rounded-sm border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Email
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-text-muted">
        Password
        <input name="password" type="password" required className={inputClass} />
      </label>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-sm bg-accent px-4 py-2 font-semibold text-bg disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

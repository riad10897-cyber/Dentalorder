"use client";

import { useActionState, useId } from "react";
import { changePassword, type PasswordFormState } from "@/app/actions/password";

const initialState: PasswordFormState = { error: null, fieldErrors: {}, saved: false };

const inputClass =
  "min-h-11 w-full rounded-control border border-rule bg-card px-3 py-2 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Current password" error={state.fieldErrors.current_password}>
        {(a) => <input {...a} name="current_password" type="password" autoComplete="current-password" required className={inputClass} />}
      </Field>
      <Field label="New password" error={state.fieldErrors.new_password} hint="At least 8 characters.">
        {(a) => <input {...a} name="new_password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />}
      </Field>
      <Field label="New password, again" error={state.fieldErrors.confirm_password}>
        {(a) => <input {...a} name="confirm_password" type="password" autoComplete="new-password" required className={inputClass} />}
      </Field>

      {state.error && (
        <p className="text-small text-ink" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="pressable min-h-11 rounded-control bg-ink px-4 py-3 font-display text-body text-card disabled:opacity-60"
      >
        {pending ? "Changing…" : "Change password"}
      </button>

      <p aria-live="polite" className="min-h-[1.25rem] text-center text-caption text-ink-muted">
        {state.saved ? "Password changed. Use the new one next time you sign in." : ""}
      </p>
    </form>
  );
}

/**
 * The label names the field and nothing else; the hint and the error are
 * tied to it with aria-describedby, so a screen reader announces "New
 * password" and then the rule, not one long run-on name.
 */
function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-1 text-small text-ink-muted">
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-describedby": note ? noteId : undefined, "aria-invalid": error ? true : undefined })}
      {note && (
        <span id={noteId} className={`text-caption ${error ? "text-ink" : "text-ink-faint"}`}>
          {note}
        </span>
      )}
    </div>
  );
}

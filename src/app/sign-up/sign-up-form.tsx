"use client";

import { useActionState, useState } from "react";
import { signUp, type FormState } from "@/app/actions/auth";

type Rep = {
  id: string;
  display_name: string;
  university: string | null;
  section: string | null;
};

type Role = "student" | "rep" | "supplier";

const ROLES: { value: Role; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "rep", label: "Representative" },
  { value: "supplier", label: "Supplier" },
];

const initialState: FormState = { error: null, fieldErrors: {} };

export function SignUpForm({ reps }: { reps: Rep[] }) {
  const [role, setRole] = useState<Role>("student");
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Account type">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={role === r.value}
            onClick={() => setRole(r.value)}
            className={`min-h-11 rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
              role === r.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-surface text-text-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="role" value={role} />

      <Field label="Full name" name="full_name" error={state.fieldErrors.full_name}>
        <input name="full_name" type="text" required className={inputClass} />
      </Field>

      <Field label="Email" name="email" error={state.fieldErrors.email}>
        <input name="email" type="email" required className={inputClass} />
      </Field>

      <Field label="Password" name="password" error={state.fieldErrors.password}>
        <input name="password" type="password" required minLength={8} className={inputClass} />
      </Field>

      {role === "student" && (
        <>
          <Field label="University" name="university" error={state.fieldErrors.university}>
            <input name="university" type="text" required placeholder="BAU, LU, USJ..." className={inputClass} />
          </Field>
          <Field label="Year of study" name="year_of_study" error={state.fieldErrors.year_of_study}>
            <select name="year_of_study" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Select year
              </option>
              {[1, 2, 3, 4, 5].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Section (optional)" name="section" error={state.fieldErrors.section}>
            <input name="section" type="text" className={inputClass} />
          </Field>
          {reps.length > 0 ? (
            <Field label="Your representative" name="rep_id" error={state.fieldErrors.rep_id}>
              <select name="rep_id" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  Choose your rep
                </option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.display_name}
                    {rep.university ? ` — ${rep.university}` : ""}
                    {rep.section ? ` (${rep.section})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div className="rounded-sm border border-dashed border-border bg-surface p-3 text-sm text-text-muted">
              <p>
                No representative has joined yet. That&apos;s fine — create your account now and
                pick your rep from your profile once they&apos;re on DentalOrder.
              </p>
              <input type="hidden" name="rep_id" value="" />
            </div>
          )}
        </>
      )}

      {role === "rep" && (
        <>
          <Field label="University" name="university" error={state.fieldErrors.university}>
            <input name="university" type="text" required className={inputClass} />
          </Field>
          <Field label="Year of study (optional)" name="year_of_study" error={state.fieldErrors.year_of_study}>
            <input name="year_of_study" type="number" min={1} max={5} className={inputClass} />
          </Field>
          <Field label="Section (optional)" name="section" error={state.fieldErrors.section}>
            <input name="section" type="text" className={inputClass} />
          </Field>
          <Field label="Whish number (optional)" name="whish_number" error={state.fieldErrors.whish_number}>
            <input name="whish_number" type="text" className={inputClass} />
          </Field>
        </>
      )}

      {role === "supplier" && (
        <>
          <Field label="Business name" name="business_name" error={state.fieldErrors.business_name}>
            <input name="business_name" type="text" required className={inputClass} />
          </Field>
          <Field label="Contact phone" name="contact_phone" error={state.fieldErrors.contact_phone}>
            <input name="contact_phone" type="tel" required className={inputClass} />
          </Field>
          <Field label="Contact email (optional)" name="contact_email" error={state.fieldErrors.contact_email}>
            <input name="contact_email" type="email" className={inputClass} />
          </Field>
          <Field label="Description (optional)" name="description" error={state.fieldErrors.description}>
            <textarea name="description" rows={3} className={inputClass} />
          </Field>
          <p className="text-xs text-warning">
            Your account will be reviewed by an admin before you can list products.
          </p>
        </>
      )}

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-sm bg-accent px-4 py-2 font-semibold text-bg disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

const inputClass =
  "min-h-11 w-full rounded-sm border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus:border-accent focus:outline-none";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-text-muted">
      {label}
      {children}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  );
}

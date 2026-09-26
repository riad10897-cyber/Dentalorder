"use client";

import { useActionState, useState } from "react";
import { signUp, type FormState } from "@/app/actions/auth";
import { OTHER_UNIVERSITY, UNIVERSITIES } from "@/lib/universities";


type Role = "student" | "supplier";

// Two account types, not three. A student who also sells teeth is a
// student account with a supplier profile attached — not a third kind of
// sign-up — so it is not offered here.
const ROLES: { value: Role; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "supplier", label: "Shop / supplier" },
];

const initialState: FormState = { error: null, fieldErrors: {} };

export function SignUpForm() {
  const [role, setRole] = useState<Role>("student");
  const [, setUniversity] = useState("");
  const [state, formAction, pending] = useActionState(signUp, initialState);


  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={role === r.value}
            onClick={() => setRole(r.value)}
            className={`min-h-11 rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
              role === r.value
                ? "border-ink bg-ink/10 text-ink"
                : "border-rule bg-card text-ink-muted"
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
          <UniversityField error={state.fieldErrors.university} onChange={setUniversity} />
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
        </>
      )}

      {role === "supplier" && (
        <>
          <Field label="Business name" name="business_name" error={state.fieldErrors.business_name}>
            <input name="business_name" type="text" required className={inputClass} />
          </Field>
          <UniversityField
            error={state.fieldErrors.university}
            optional
            label="Closest faculty (optional)"
          />
          <Field label="Contact phone" name="contact_phone" error={state.fieldErrors.contact_phone}>
            <input name="contact_phone" type="tel" required className={inputClass} />
          </Field>
          <Field label="Contact email (optional)" name="contact_email" error={state.fieldErrors.contact_email}>
            <input name="contact_email" type="email" className={inputClass} />
          </Field>
          <Field label="Description (optional)" name="description" error={state.fieldErrors.description}>
            <textarea name="description" rows={3} className={inputClass} />
          </Field>
          <p className="text-xs text-ink-muted">
            We check every supplier by hand before students can order from you.
            You can sign in and set your prices straight away.
          </p>
        </>
      )}

      {state.error && <p className="text-sm text-ink">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-sm bg-ink px-4 py-2 font-semibold text-card disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

const inputClass =
  "min-h-11 w-full rounded-sm border border-rule bg-card px-3 py-2 text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none";

function UniversityField({
  error,
  onChange,
  optional = false,
  label = "University",
}: {
  error?: string;
  onChange?: (university: string) => void;
  /** A shop may not sit at one faculty, so it may leave this blank. */
  optional?: boolean;
  label?: string;
}) {
  const [choice, setChoice] = useState("");
  const isOther = choice === OTHER_UNIVERSITY;
  const [typed, setTyped] = useState("");

  // One hidden field carries the answer either way, so the server sees a
  // plain university string and never has to know about the sentinel.
  const submitted = isOther ? typed : choice;

  // Reported from the change handlers rather than during render, so the
  // rep list regroups only when this control is touched — never while a
  // finger is down on a rep row below.
  function update(nextChoice: string, nextTyped: string) {
    setChoice(nextChoice);
    setTyped(nextTyped);
    onChange?.(nextChoice === OTHER_UNIVERSITY ? nextTyped : nextChoice);
  }

  return (
    <Field label={label} name="university" error={error}>
      <select
        // Unnamed on purpose: the hidden input below is the single source
        // of what gets submitted. `required` still gates the form.
        required={!optional}
        aria-label="University"
        value={choice}
        onChange={(event) => update(event.target.value, typed)}
        className={inputClass}
      >
        <option value="" disabled={!optional}>
          {optional ? "No particular faculty" : "Select your university"}
        </option>
        {UNIVERSITIES.map((university) => (
          <option key={university.value} value={university.value}>
            {university.label}
          </option>
        ))}
        <option value={OTHER_UNIVERSITY}>Other</option>
      </select>

      {isOther && (
        <input
          type="text"
          required={!optional}
          autoFocus
          aria-label="University name"
          placeholder="Type your university"
          value={typed}
          onChange={(event) => update(choice, event.target.value)}
          className={`${inputClass} mt-2`}
        />
      )}

      <input type="hidden" name="university" value={submitted} />
    </Field>
  );
}

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
    <label className="flex flex-col gap-1 text-sm text-ink-muted">
      {label}
      {children}
      {error && <span className="text-xs text-ink">{error}</span>}
    </label>
  );
}

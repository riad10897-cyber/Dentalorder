"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "@/app/actions/profile";
import { OTHER_UNIVERSITY, UNIVERSITIES } from "@/lib/universities";

const initialState: ProfileFormState = { error: null, fieldErrors: {}, saved: false };

const inputClass =
  "min-h-11 w-full rounded-control border border-rule bg-card px-3 py-2 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none";

export function ProfileForm({
  fullName,
  phone,
  university,
  yearOfStudy,
  phoneHint,
}: {
  fullName: string;
  phone: string | null;
  university: string | null;
  yearOfStudy: number | null;
  /** Why the phone number is asked for, in the words of whoever reads it. */
  phoneHint: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  // A university already on the account that is not in the list — typed as
  // "Other" at sign-up — has to stay selectable, or saving a phone number
  // would quietly rewrite where they study.
  const known = UNIVERSITIES.some((u) => u.value === university);

  return (
    // Keyed on the saved values: React resets a form after its action runs,
    // and a <select> resets to the value it first mounted with, not the new
    // one — so a saved year showed "Select year" again. A new key remounts
    // the fields with what was just saved.
    <form
      key={[fullName, phone, university, yearOfStudy].join("|")}
      action={formAction}
      className="flex flex-col gap-4"
    >
      <Field label="Full name" error={state.fieldErrors.full_name}>
        <input
          name="full_name"
          type="text"
          autoComplete="name"
          required
          defaultValue={fullName}
          className={inputClass}
        />
      </Field>

      <Field
        label="Phone number"
        error={state.fieldErrors.phone}
        hint={phoneHint}
      >
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          defaultValue={phone ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="University" error={state.fieldErrors.university}>
        <select
          name="university"
          required
          defaultValue={university ?? ""}
          className={inputClass}
        >
          <option value="" disabled>
            Select your university
          </option>
          {UNIVERSITIES.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
          {university && !known && <option value={university}>{university}</option>}
          <option value={OTHER_UNIVERSITY} disabled>
            Other — ask us to change it
          </option>
        </select>
      </Field>

      <Field label="Year of study" error={state.fieldErrors.year_of_study}>
        <select
          name="year_of_study"
          required
          defaultValue={yearOfStudy ? String(yearOfStudy) : ""}
          className={inputClass}
        >
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

      {state.error && <p className="text-small text-ink">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="pressable min-h-11 rounded-control bg-ink px-4 py-3 font-display text-body text-card disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>

      {/* Announced rather than flashed: the save is the whole interaction,
          so it says so and stays said. */}
      <p aria-live="polite" className="min-h-[1.25rem] text-center text-caption text-ink-muted">
        {state.saved ? "Saved." : ""}
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-small text-ink-muted">
      {label}
      {children}
      {hint && !error && <span className="text-caption text-ink-faint">{hint}</span>}
      {error && <span className="text-caption text-ink">{error}</span>}
    </label>
  );
}

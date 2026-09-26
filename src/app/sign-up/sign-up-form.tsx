"use client";

import { useActionState, useRef, useState } from "react";
import { signUp, type FormState } from "@/app/actions/auth";
import { OTHER_UNIVERSITY, UNIVERSITIES } from "@/lib/universities";

type Role = "student" | "supplier";

// Two account types, not three. A student who also sells teeth is a student
// account with a supplier profile attached, set up by hand — so there is no
// third button here, and no self-serve way into an approval queue.
const ROLES: { value: Role; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "supplier", label: "Shop / supplier" },
];

const initialState: FormState = { error: null, fieldErrors: {} };

/**
 * Sign-up in two steps: who you are, then where you study.
 *
 * Both steps live in one <form>, and step one's fields stay mounted while
 * step two is showing. That matters more than it looks: unmounting them
 * would drop what was typed on a back-and-forth, and would stop the
 * browser's own password manager from seeing a complete form.
 */
export function SignUpForm() {
  const [role, setRole] = useState<Role>("student");
  const [step, setStep] = useState<1 | 2>(1);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState("");
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);

  // Step one is checked here rather than on the server, because sending a
  // half-finished form only to be handed back is the slowest possible way
  // to learn that an email is missing. The server re-checks all of it.
  function toStepTwo() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const next: Record<string, string> = {};

    if (String(data.get("full_name") ?? "").trim().length < 2) {
      next.full_name = "Enter your full name.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.get("email") ?? "").trim())) {
      next.email = "Enter a valid email address.";
    }
    if (String(data.get("phone") ?? "").replace(/[^0-9]/g, "").length < 7) {
      next.phone = "Enter a phone number we can reach you on.";
    }
    if (String(data.get("password") ?? "").length < 8) {
      next.password = "Password must be at least 8 characters.";
    }

    setStepErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setStep(2);
    // Announce the change for a screen reader, and put the eye back at the
    // top — on a phone the second step renders below the fold otherwise.
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }

  const err = (field: string) => stepErrors[field] ?? state.fieldErrors[field];

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <StepDots step={step} />
        <p
          ref={headingRef}
          tabIndex={-1}
          aria-live="polite"
          className="text-caption text-ink-muted outline-none"
        >
          {step === 1 ? "Step 1 of 2 · About you" : "Step 2 of 2 · Where you study"}
        </p>
      </div>

      {/* Hidden, not unmounted: see the note on the component. */}
      <div className={step === 1 ? "flex flex-col gap-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={role === r.value}
              onClick={() => setRole(r.value)}
              className={`pressable min-h-11 rounded-control border px-3 py-2 text-small font-medium ${
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

        <Field label="Full name" error={err("full_name")}>
          <input name="full_name" type="text" autoComplete="name" required className={inputClass} />
        </Field>

        <Field label="Email" error={err("email")}>
          <input name="email" type="email" autoComplete="email" required className={inputClass} />
        </Field>

        <Field
          label="Phone number"
          error={err("phone")}
          hint={
            role === "student"
              ? "Your supplier needs a way to reach you about your order."
              : "Students will use this to reach you about their orders."
          }
        >
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
          />
        </Field>
        {/* The sign-up trigger reads contact_phone when it writes a shop's row. */}
        {role === "supplier" && <input type="hidden" name="contact_phone" value={phone} />}

        <Field label="Password" error={err("password")}>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
          />
        </Field>

        <button
          type="button"
          onClick={toStepTwo}
          className="pressable min-h-11 rounded-control bg-ink px-4 py-3 font-display text-body text-card"
        >
          Continue
        </button>
      </div>

      <div className={step === 2 ? "flex flex-col gap-4" : "hidden"}>
        {role === "student" ? (
          <>
            <UniversityField error={err("university")} />
            <Field label="Year of study" error={err("year_of_study")}>
              <select
                name="year_of_study"
                required={step === 2}
                className={inputClass}
                defaultValue=""
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
          </>
        ) : (
          <>
            <Field label="Business name" error={err("business_name")}>
              <input name="business_name" type="text" required={step === 2} className={inputClass} />
            </Field>
            <UniversityField error={err("university")} optional label="Closest faculty (optional)" />
            <Field label="Contact email (optional)" error={err("contact_email")}>
              <input name="contact_email" type="email" className={inputClass} />
            </Field>
            <Field label="Description (optional)" error={err("description")}>
              <textarea name="description" rows={3} className={inputClass} />
            </Field>
            <p className="text-caption text-ink-muted">
              We check every supplier by hand before students can order from you. You can sign in
              and set your prices straight away.
            </p>
          </>
        )}

        {state.error && <p className="text-small text-ink">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="pressable min-h-11 rounded-control bg-ink px-4 py-3 font-display text-body text-card disabled:opacity-60"
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="pressable min-h-11 rounded-control py-2 text-small text-ink-muted"
        >
          Back
        </button>
      </div>
    </form>
  );
}

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <span className="flex items-center gap-1.5" aria-hidden>
      {[1, 2].map((n) => (
        <span
          key={n}
          className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${
            n === step ? "w-5 bg-ink" : "w-1.5 bg-rule"
          }`}
        />
      ))}
    </span>
  );
}

const inputClass =
  "min-h-11 w-full rounded-control border border-rule bg-card px-3 py-2 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none";

function UniversityField({
  error,
  optional = false,
  label = "University",
}: {
  error?: string;
  /** A shop may not sit at one faculty, so it may leave this blank. */
  optional?: boolean;
  label?: string;
}) {
  const [choice, setChoice] = useState("");
  const [typed, setTyped] = useState("");
  const isOther = choice === OTHER_UNIVERSITY;

  // One hidden field carries the answer either way, so the server sees a
  // plain university string and never has to know about the sentinel.
  const submitted = isOther ? typed : choice;

  return (
    <Field label={label} error={error}>
      <select
        // Unnamed on purpose: the hidden input below is the single source
        // of what gets submitted.
        required={!optional}
        aria-label={label}
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
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
          onChange={(event) => setTyped(event.target.value)}
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

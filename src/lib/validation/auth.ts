import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.");
const password = z.string().min(8, "Password must be at least 8 characters.");
const fullName = z.string().trim().min(2, "Enter your full name.");

// Lebanese numbers are given as 03 123 456, 71 123 456, +961 3 123 456 —
// spaces, dashes and the country code all appear. Rather than police a
// format nobody agrees on, this strips the punctuation and asks only that
// enough digits are left to dial. The stored value is what they typed.
const phone = z
  .string()
  .trim()
  .min(1, "Enter a phone number.")
  .refine((v) => v.replace(/[^0-9]/g, "").length >= 7, "That does not look like a phone number.");

// Empty FormData values are "", not absent. Coercing "" straight to a number
// gives 0, which then fails min(1) before .optional() ever gets a chance —
// so blank out empty strings first.
const optionalYearOfStudy = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.coerce.number().int().min(1).max(5).optional(),
);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});
export type SignInInput = z.infer<typeof signInSchema>;

// Five things asked, plus the password auth cannot do without. Section is
// gone: it grouped students under a rep, and there are no reps to group
// under. Year is kept because it is asked once and cheap to store, but
// nothing reads it yet — no screen filters on it, and none should be
// built on the assumption that it does.
export const studentSignUpSchema = z.object({
  role: z.literal("student"),
  email,
  password,
  full_name: fullName,
  phone,
  university: z.string().trim().min(1, "Select your university."),
  year_of_study: z.coerce.number().int().min(1).max(5),
});

// A shop, signing up to sell to students. A student who also supplies is
// not this: that account is a student with a suppliers row, and it is
// created from the student side, not here.
export const supplierSignUpSchema = z.object({
  role: z.literal("supplier"),
  email,
  password,
  full_name: fullName,
  phone,
  university: z.string().trim().optional(),
  year_of_study: optionalYearOfStudy,
  business_name: z.string().trim().min(1, "Enter your business name."),
  // The shop's number is the one they gave in step 1 — the form mirrors it
  // here so the sign-up trigger, which reads contact_phone, still gets it.
  contact_phone: phone,
  contact_email: z.string().trim().email().optional().or(z.literal("")),
  description: z.string().trim().optional(),
});

// No adminSignUpSchema: admin accounts are never created through the public
// sign-up form. They're set manually in the database — see CLAUDE.md.
// No repSignUpSchema either: the role is gone from the product. The
// database still clamps anything unrecognised down to 'student'.
export const signUpSchema = z.discriminatedUnion("role", [
  studentSignUpSchema,
  supplierSignUpSchema,
]);
export type SignUpInput = z.infer<typeof signUpSchema>;

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

// Sign-up makes students, and only students. Suppliers are made by hand
// by the owner (OPERATIONS.md §1). The database enforces the same rule in
// handle_new_user, because Supabase's sign-up can be called directly
// without going through this form or this schema at all.
export const signUpSchema = studentSignUpSchema;
export type SignUpInput = z.infer<typeof signUpSchema>;

// What a student may change about themselves. Deliberately not a partial of
// the sign-up schema: role, email and password are not editable here, and
// leaving them out of the shape is what keeps them that way.
export const updateStudentProfileSchema = z.object({
  full_name: fullName,
  phone,
  university: z.string().trim().min(1, "Select your university."),
  year_of_study: z.coerce.number().int().min(1, "Select your year.").max(5),
});

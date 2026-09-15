import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.");
const password = z.string().min(8, "Password must be at least 8 characters.");
const fullName = z.string().trim().min(2, "Enter your full name.");

// Empty FormData values are "", not absent. Coercing "" straight to a number
// gives 0, which then fails min(1) before .optional() ever gets a chance —
// so blank out empty strings first.
const optionalYearOfStudy = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.coerce.number().int().min(1).max(5).optional(),
);

// A student can sign up before their rep has joined the platform — they
// pick a rep later instead. Same empty-string-to-undefined problem as
// above: an unselected <select> still submits "".
const optionalRepId = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().uuid("Choose your representative.").optional(),
);

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const studentSignUpSchema = z.object({
  role: z.literal("student"),
  email,
  password,
  full_name: fullName,
  university: z.string().trim().min(1, "Select your university."),
  year_of_study: z.coerce.number().int().min(1).max(5),
  section: z.string().trim().optional(),
  rep_id: optionalRepId,
});

export const repSignUpSchema = z.object({
  role: z.literal("rep"),
  email,
  password,
  full_name: fullName,
  university: z.string().trim().min(1, "Select your university."),
  year_of_study: optionalYearOfStudy,
  section: z.string().trim().optional(),
  whish_number: z.string().trim().optional(),
});

export const supplierSignUpSchema = z.object({
  role: z.literal("supplier"),
  email,
  password,
  full_name: fullName,
  business_name: z.string().trim().min(1, "Enter your business name."),
  contact_phone: z.string().trim().min(1, "Enter a contact phone number."),
  contact_email: z.string().trim().email().optional().or(z.literal("")),
  description: z.string().trim().optional(),
});

// No adminSignUpSchema: admin accounts are never created through the public
// sign-up form. They're set manually in the database — see CLAUDE.md.
export const signUpSchema = z.discriminatedUnion("role", [
  studentSignUpSchema,
  repSignUpSchema,
  supplierSignUpSchema,
]);
export type SignUpInput = z.infer<typeof signUpSchema>;

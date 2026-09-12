import { z } from "zod";

const email = z.string().trim().email("Enter a valid email address.");
const password = z.string().min(8, "Password must be at least 8 characters.");
const fullName = z.string().trim().min(2, "Enter your full name.");

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
  rep_id: z.string().uuid("Choose your representative."),
});

export const repSignUpSchema = z.object({
  role: z.literal("rep"),
  email,
  password,
  full_name: fullName,
  university: z.string().trim().min(1, "Enter your university."),
  year_of_study: z.coerce.number().int().min(1).max(5).optional(),
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

export const adminSignUpSchema = z.object({
  role: z.literal("admin"),
  email,
  password,
  full_name: fullName,
});

export const signUpSchema = z.discriminatedUnion("role", [
  studentSignUpSchema,
  repSignUpSchema,
  supplierSignUpSchema,
  adminSignUpSchema,
]);
export type SignUpInput = z.infer<typeof signUpSchema>;

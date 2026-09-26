"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { homeForUser } from "@/lib/supabase/home";
import { SUPPLIER_DIRECTORY_TAG } from "@/lib/supplier/directory";

export type FormState = {
  error: string | null;
  fieldErrors: Record<string, string>;
};

function firstFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function signUp(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = signUpSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.issues),
    };
  }

  const { email, password, role, ...profileFields } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, ...profileFields },
    },
  });

  if (error) {
    return { error: error.message, fieldErrors: {} };
  }

  // A new supplier changes the market every student picks from, so drop
  // that cache rather than leaving them invisible until it expires. They
  // only appear once approved, but the tag is cheap and the approval may
  // land before the ceiling does.
  if (role === "supplier") {
    revalidateTag(SUPPLIER_DIRECTORY_TAG);
  }

  if (!data.session) {
    // Email confirmation is required — no session yet, nothing to route to.
    redirect("/check-email");
  }

  // A brand-new supplier has a suppliers row by now (the sign-up trigger
  // writes it), so the same routing rule serves both roles.
  redirect(await homeForUser(data.user!.id));
}

export async function signIn(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = signInSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: firstFieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password.", fieldErrors: {} };
  }

  redirect(await homeForUser(data.user.id));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

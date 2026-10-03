"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validation/auth";

export type PasswordFormState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  saved: boolean;
};

/**
 * Changes the signed-in person's password, after checking the current one.
 *
 * The current password is checked on a separate client that keeps no
 * cookies, so a wrong guess cannot disturb the session the person is
 * actually signed in with; the session it opens is closed straight after.
 * The change itself goes through the person's own session — whose account
 * it is comes from the verified cookie, never from the form.
 */
export async function changePassword(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: null, fieldErrors, saved: false };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = claims?.claims?.email;
  if (typeof email !== "string" || !email) {
    return { error: "Sign in again to change your password.", fieldErrors: {}, saved: false };
  }

  const checker = createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: wrong } = await checker.auth.signInWithPassword({
    email,
    password: parsed.data.current_password,
  });
  if (wrong) {
    return {
      error: null,
      fieldErrors: { current_password: "That is not your current password." },
      saved: false,
    };
  }
  await checker.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: parsed.data.new_password });
  if (error) {
    return { error: "The password could not be changed. Try again.", fieldErrors: {}, saved: false };
  }
  return { error: null, fieldErrors: {}, saved: true };
}

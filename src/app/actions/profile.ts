"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { updateStudentProfileSchema } from "@/lib/validation/auth";

export type ProfileFormState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  saved: boolean;
};

/**
 * Saves the four things anyone may change about themselves — a student on
 * Profile, a seller on Settings.
 *
 * The row is addressed by the id from the verified session, never by an id
 * sent up with the form — that is what stops this being a way to edit
 * somebody else's profile. `role` is not in the schema, so it cannot be
 * changed here even if it is posted.
 */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const userId = await getVerifiedUserId();
  if (!userId) return { error: "Sign in again to save changes.", fieldErrors: {}, saved: false };

  const parsed = updateStudentProfileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors, saved: false };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      university: parsed.data.university,
      year_of_study: parsed.data.year_of_study,
    })
    .eq("id", userId);

  if (error) return { error: error.message, fieldErrors: {}, saved: false };

  revalidatePath("/student/profile");
  revalidatePath("/student");
  revalidatePath("/student/profile/details");
  revalidatePath("/supplier/settings");
  revalidatePath("/supplier/settings/details");
  return { error: null, fieldErrors: {}, saved: true };
}

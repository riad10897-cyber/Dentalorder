"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/auth";

export type AssignRepResult = { ok: true } | { ok: false; error: string };

const assignRepSchema = z.object({ repId: z.string().uuid() });

export async function assignRep(input: { repId: string }): Promise<AssignRepResult> {
  const parsed = assignRepSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Choose a representative from the list." };
  }

  const userId = await getVerifiedUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();

  // Upsert: a first-time pick inserts, switching reps later updates the
  // same row (student_id is the primary key).
  const { error } = await supabase
    .from("student_reps")
    .upsert({ student_id: userId, rep_id: parsed.data.repId }, { onConflict: "student_id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

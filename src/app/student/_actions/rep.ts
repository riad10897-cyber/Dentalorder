"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AssignRepResult = { ok: true } | { ok: false; error: string };

const assignRepSchema = z.object({ repId: z.string().uuid() });

export async function assignRep(input: { repId: string }): Promise<AssignRepResult> {
  const parsed = assignRepSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Choose a representative from the list." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Upsert: a first-time pick inserts, switching reps later updates the
  // same row (student_id is the primary key).
  const { error } = await supabase
    .from("student_reps")
    .upsert({ student_id: user.id, rep_id: parsed.data.repId }, { onConflict: "student_id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

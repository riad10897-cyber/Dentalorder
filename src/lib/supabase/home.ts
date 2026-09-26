import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Where a signed-in user belongs.
 *
 * Supplying is a row in `suppliers`, not a role — that is what lets one
 * account be both a student and a supplier. So home is two questions, not
 * a lookup table: admins go to /admin, anyone with a suppliers row goes to
 * /supplier (pending ones included — that screen is what explains the
 * wait), everyone else to /student.
 */
export async function homeForUser(userId: string): Promise<string> {
  const supabase = await createClient();
  const [{ data: profile }, { data: supplier }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", userId).single(),
    supabase.from("suppliers").select("id").eq("id", userId).maybeSingle(),
  ]);

  if (!profile) return "/sign-in";
  if (profile.role === "admin") return "/admin";
  return supplier ? "/supplier" : "/student";
}

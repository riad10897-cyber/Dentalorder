import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export const REP_DIRECTORY_TAG = "rep-directory";

export interface DirectoryRep {
  id: string;
  displayName: string;
  university: string | null;
  section: string | null;
}

/**
 * Who a student can pick as their rep.
 *
 * Deliberately built on a cookieless anonymous client rather than the
 * request-scoped one. The rep list is public (its RLS policy allows
 * select to everyone) and identical for every visitor, so nothing here
 * is user-scoped — which is exactly what makes it safe to cache. A
 * function that read cookies could not be cached at all, and caching one
 * that did would leak one student's view to another.
 *
 * Prices are not in here on purpose: a student's own rep prices come
 * from their student_reps row, which is user-scoped and always live.
 */
async function fetchRepDirectory(): Promise<DirectoryRep[]> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // rep_directory, not representatives: the view carries only the four
  // columns a stranger is allowed to see. The base table no longer answers
  // an unauthenticated read at all, and this page needs one — sign-up shows
  // the list before the account exists.
  const { data } = await supabase
    .from("rep_directory")
    .select("id, display_name, university, section")
    .order("display_name");

  return (data ?? []).map((rep) => ({
    id: rep.id,
    displayName: rep.display_name,
    university: rep.university,
    section: rep.section,
  }));
}

export const getRepDirectory = unstable_cache(fetchRepDirectory, ["rep-directory"], {
  tags: [REP_DIRECTORY_TAG],
  // A new rep signing up calls revalidateTag, so this ceiling only
  // matters if a rep row is changed directly in the database.
  revalidate: 300,
});

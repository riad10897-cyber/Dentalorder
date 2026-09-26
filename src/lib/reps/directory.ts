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
  // What the student will actually pay. Shown when confirming a switch,
  // because the prices are the thing that changes for them.
  frasacoPrice: number;
  copyAPrice: number;
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

  // rep_directory, not representatives: the view carries only the columns a
  // stranger is allowed to see — name, faculty, section and prices, but not
  // the payment handle. The base table no longer answers an unauthenticated
  // read at all, and this page needs one: sign-up shows the list before the
  // account exists.
  const { data } = await supabase
    .from("rep_directory")
    .select("id, display_name, university, section, frasaco_price, copy_a_price")
    .order("display_name");

  return (data ?? []).map((rep) => ({
    id: rep.id,
    displayName: rep.display_name,
    university: rep.university,
    section: rep.section,
    frasacoPrice: Number(rep.frasaco_price),
    copyAPrice: Number(rep.copy_a_price),
  }));
}

export const getRepDirectory = unstable_cache(fetchRepDirectory, ["rep-directory"], {
  tags: [REP_DIRECTORY_TAG],
  // A new rep signing up calls revalidateTag, so this ceiling only
  // matters if a rep row is changed directly in the database.
  revalidate: 300,
});

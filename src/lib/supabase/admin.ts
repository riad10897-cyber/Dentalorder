import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Secret-key client. Bypasses RLS entirely.
 * Only for trusted server-side operations (e.g. the RLS verification script,
 * admin-only server actions that must act across rows RLS would otherwise block).
 * `import "server-only"` makes bundling this into a client component a build error.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

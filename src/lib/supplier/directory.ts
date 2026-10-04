import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database, SupplierKind } from "@/lib/supabase/types";

export const SUPPLIER_DIRECTORY_TAG = "supplier-directory";

export interface DirectorySupplier {
  id: string;
  displayName: string;
  kind: SupplierKind;
  university: string | null;
  frasacoPrice: number;
  copyAPrice: number;
}

async function fetchSupplierDirectory(): Promise<DirectorySupplier[]> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // supplier_directory, not suppliers: the view carries only what a
  // stranger may see, and only suppliers who are actually taking orders.
  // The base table answers no unauthenticated read at all, and sign-up
  // needs this list before the account exists.
  const { data } = await supabase
    .from("supplier_directory")
    .select("id, display_name, kind, university, frasaco_price, copy_a_price")
    .order("display_name");

  return (data ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    kind: row.kind,
    university: row.university,
    frasacoPrice: Number(row.frasaco_price),
    copyAPrice: Number(row.copy_a_price),
  }));
}

export const getSupplierDirectory = unstable_cache(
  fetchSupplierDirectory,
  ["supplier-directory"],
  {
    // Sign-up and a supplier's own price change call revalidateTag.
    // Anything done by hand in SQL cannot — approving, suspending or
    // deleting a seller — so this ceiling is how long the market can show
    // a seller who is gone. Five minutes was long enough to look broken
    // after a wipe; thirty seconds is not. Anything that commits money
    // reads getSupplierFresh instead.
    tags: [SUPPLIER_DIRECTORY_TAG],
    revalidate: 30,
  },
);

/**
 * One supplier's listing, read now rather than from the cached list.
 *
 * For screens that commit money — editing an order compares the order's
 * prices against these, and the database refuses the save if the student
 * was shown a different total. Read from a cache that can be minutes
 * behind, that refusal would repeat on every retry.
 */
export async function getSupplierFresh(supplierId: string): Promise<DirectorySupplier | null> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await supabase
    .from("supplier_directory")
    .select("id, display_name, kind, university, frasaco_price, copy_a_price")
    .eq("id", supplierId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    kind: data.kind,
    university: data.university,
    frasacoPrice: Number(data.frasaco_price),
    copyAPrice: Number(data.copy_a_price),
  };
}

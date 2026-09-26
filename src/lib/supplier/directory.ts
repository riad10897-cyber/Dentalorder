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
    // A new supplier being approved calls revalidateTag, so this ceiling
    // only matters if that is missed.
    tags: [SUPPLIER_DIRECTORY_TAG],
    revalidate: 300,
  },
);

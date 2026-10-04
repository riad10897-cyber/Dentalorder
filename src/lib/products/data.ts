import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PRODUCT_CATEGORIES, type ProductCategorySlug } from "./categories";

export interface Product {
  id: string;
  name: string;
  category: ProductCategorySlug;
  price: number;
  unit: string | null;
  brand: string | null;
  description: string | null;
  inStock: boolean;
  /** Off means the seller stopped selling it. */
  isActive: boolean;
}

type Row = {
  id: string;
  name: string;
  price: string;
  unit: string | null;
  brand: string | null;
  description: string | null;
  in_stock: boolean;
  is_active: boolean;
  product_categories: { slug: string } | null;
};

const SELECT = "id, name, price, unit, brand, description, in_stock, is_active, product_categories(slug)";

function toProduct(row: Row): Product {
  return {
    id: row.id,
    name: row.name,
    category: (row.product_categories?.slug ?? "materials") as ProductCategorySlug,
    price: Number(row.price),
    unit: row.unit,
    brand: row.brand,
    description: row.description,
    inStock: row.in_stock,
    isActive: row.is_active,
  };
}

// Category order first, then name: the order a student scans a shelf in.
function byShelf(a: Product, b: Product): number {
  const order = (slug: string) => PRODUCT_CATEGORIES.findIndex((c) => c.slug === slug);
  return order(a.category) - order(b.category) || a.name.localeCompare(b.name);
}

/** Everything a seller has listed, on or off, in stock or not. RLS: own rows only. */
export async function listOwnProducts(supplierId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(SELECT)
    .eq("supplier_id", supplierId);
  return ((data ?? []) as Row[]).map(toProduct).sort(byShelf);
}

/**
 * What a student can add to an order from this seller, read now.
 *
 * Fresh, never cached, for the same reason the chart's tooth prices are:
 * these prices go into the total the database is asked to confirm. RLS
 * already limits a student to switched-on, in-stock products of active
 * sellers; the filters are repeated so the intent is readable here.
 */
export async function listOrderableProducts(supplierId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(SELECT)
    .eq("supplier_id", supplierId)
    .eq("is_active", true)
    .eq("in_stock", true);
  return ((data ?? []) as Row[]).map(toProduct).sort(byShelf);
}

/** One of the seller's own products, for its edit screen. RLS: own rows only. */
export async function getOwnProduct(supplierId: string, productId: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(SELECT)
    .eq("supplier_id", supplierId)
    .eq("id", productId)
    .maybeSingle();
  return data ? toProduct(data as Row) : null;
}

/**
 * How many extras each seller has on sale right now, for the market rows.
 * RLS (products_select_market) already limits this to switched-on, in-stock
 * products of sellers taking orders; the filters repeat it for reading.
 */
export async function countOrderableBySupplier(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("supplier_id")
    .eq("is_active", true)
    .eq("in_stock", true);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.supplier_id] = (counts[row.supplier_id] ?? 0) + 1;
  return counts;
}

export async function categoryIdFor(slug: ProductCategorySlug): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("product_categories").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

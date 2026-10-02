"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { categoryIdFor } from "@/lib/products/data";
import { productIdSchema, productInputSchema } from "@/lib/validation/products";

export type ProductActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// Every write below is confined to the seller's own products by RLS
// (products_*_own). Each also reads back what it changed: when RLS filters
// a row out, PostgREST answers success with nothing changed, and a seller
// must not be told "saved" when nothing was.

export async function createProduct(input: unknown): Promise<ProductActionResult> {
  const userId = await getVerifiedUserId();
  if (!userId) return { ok: false, error: "Sign in again to save." };

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }

  const categoryId = await categoryIdFor(parsed.data.category);
  if (!categoryId) return { ok: false, error: "That category is missing. Tell the owner." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      supplier_id: userId,
      category_id: categoryId,
      name: parsed.data.name,
      price: parsed.data.price.toFixed(2),
      unit: parsed.data.unit,
    })
    .select("id");

  if (error) {
    // RLS refuses an insert from a seller who is not active.
    if (error.code === "42501") return { ok: false, error: "Your seller account isn't active, so you can't add products yet." };
    return { ok: false, error: error.message };
  }
  if (!data || data.length === 0) return { ok: false, error: "That product wasn't saved. Try again." };
  revalidatePath("/supplier/products");
  return { ok: true };
}

export async function updateProduct(productId: string, input: unknown): Promise<ProductActionResult> {
  if (!productIdSchema.safeParse(productId).success) return { ok: false, error: "That product isn't valid." };
  const userId = await getVerifiedUserId();
  if (!userId) return { ok: false, error: "Sign in again to save." };

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const categoryId = await categoryIdFor(parsed.data.category);
  if (!categoryId) return { ok: false, error: "That category is missing. Tell the owner." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      category_id: categoryId,
      name: parsed.data.name,
      price: parsed.data.price.toFixed(2),
      unit: parsed.data.unit,
    })
    .eq("id", productId)
    .eq("supplier_id", userId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "That product couldn't be updated. Refresh and try again." };
  revalidatePath("/supplier/products");
  return { ok: true };
}

/** In stock / out of stock: the everyday switch. */
export async function setProductInStock(productId: string, inStock: boolean): Promise<ProductActionResult> {
  return setFlag(productId, { in_stock: inStock });
}

/** On / off: off means the seller stopped selling it. Past orders keep it. */
export async function setProductActive(productId: string, isActive: boolean): Promise<ProductActionResult> {
  return setFlag(productId, { is_active: isActive });
}

async function setFlag(
  productId: string,
  patch: { in_stock: boolean } | { is_active: boolean },
): Promise<ProductActionResult> {
  if (!productIdSchema.safeParse(productId).success) return { ok: false, error: "That product isn't valid." };
  const values = Object.values(patch);
  if (values.length !== 1 || typeof values[0] !== "boolean") return { ok: false, error: "That change isn't valid." };
  const userId = await getVerifiedUserId();
  if (!userId) return { ok: false, error: "Sign in again to save." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .eq("supplier_id", userId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "That product couldn't be updated. Refresh and try again." };
  revalidatePath("/supplier/products");
  return { ok: true };
}

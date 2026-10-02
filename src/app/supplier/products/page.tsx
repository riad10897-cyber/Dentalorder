import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { getSupplierContext } from "@/lib/supplier/data";
import { listOwnProducts } from "@/lib/products/data";
import { SupplierBottomNav } from "../_components/bottom-nav";
import { ProductsClient } from "./products-client";

export default async function SupplierProductsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [supplier, products] = await Promise.all([getSupplierContext(userId), listOwnProducts(userId)]);
  if (!supplier) redirect("/student");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <h1 className="font-display text-display">Products</h1>
        <p className="mt-1 text-small text-ink-muted">
          Students add these to their weekly order with you, beside their teeth.
        </p>
      </header>
      <ProductsClient products={products} canAdd={supplier.status === "active"} />
      <SupplierBottomNav />
    </main>
  );
}

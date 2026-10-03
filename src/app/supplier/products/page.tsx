import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { getSupplierContext } from "@/lib/supplier/data";
import { listOwnProducts } from "@/lib/products/data";
import { SupplierBottomNav } from "../_components/bottom-nav";
import { ProductsClient } from "./products-client";
import { ToothPricesForm } from "./tooth-prices-form";

/** Everything a seller sells, and its price: teeth first, then extras. */
export default async function SupplierProductsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [supplier, products] = await Promise.all([getSupplierContext(userId), listOwnProducts(userId)]);
  if (!supplier) redirect("/student");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <h1 className="font-display text-display">Products</h1>
        <p className="mt-1 text-small text-ink-muted">What you sell, and what you charge for it.</p>
      </header>

      <section className="mt-5 px-5" aria-labelledby="teeth-heading">
        <h2 id="teeth-heading" className="px-0.5 pb-1.5 text-micro uppercase text-ink-faint">
          Teeth
        </h2>
        <ToothPricesForm
          frasacoPrice={supplier.frasacoPrice}
          copyAPrice={supplier.copyAPrice}
          disabled={supplier.status === "suspended"}
        />
      </section>

      <section className="mt-7" aria-labelledby="extras-heading">
        <div className="px-5">
          <h2 id="extras-heading" className="px-0.5 text-micro uppercase text-ink-faint">
            Extras
          </h2>
          <p className="mt-1 px-0.5 text-small text-ink-muted">
            Students add these to their weekly order with you, beside their teeth.
          </p>
        </div>
        <ProductsClient products={products} canAdd={supplier.status === "active"} />
      </section>

      <SupplierBottomNav />
    </main>
  );
}

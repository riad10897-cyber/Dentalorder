import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { getSupplierContext } from "@/lib/supplier/data";
import { listOwnProducts } from "@/lib/products/data";
import { SupplierBottomNav } from "../_components/bottom-nav";
import { ProductsClient } from "./products-client";
import { ToothPricesForm } from "./tooth-prices-form";
import { CheckIcon } from "@/app/_components/icons";

/** Everything a seller sells, and its price: teeth first, then extras. */
const DONE_LABEL = { added: "Added", saved: "Saved", off: "Switched off" } as const;

export default async function SupplierProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; id?: string }>;
}) {
  const { done, id } = await searchParams;
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [supplier, products] = await Promise.all([getSupplierContext(userId), listOwnProducts(userId)]);
  if (!supplier) redirect("/student");

  // Only a product of this seller's own, named from their own list: the
  // address can say which, never what it is called.
  const justDone = done && done in DONE_LABEL ? products.find((p) => p.id === id) : undefined;
  const doneLabel = justDone ? DONE_LABEL[done as keyof typeof DONE_LABEL] : null;

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
        {justDone && doneLabel && (
          <p
            role="status"
            className="note-in mx-5 mt-3 flex items-center gap-2 rounded-control border border-rule bg-card-sunk px-3 py-2.5 text-small text-ink"
          >
            <CheckIcon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              {doneLabel} · {justDone.name}
            </span>
          </p>
        )}
        <ProductsClient products={products} canAdd={supplier.status === "active"} />
      </section>

      <SupplierBottomNav />
    </main>
  );
}

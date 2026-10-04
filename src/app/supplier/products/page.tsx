import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { getSupplierContext } from "@/lib/supplier/data";
import { listOwnProducts } from "@/lib/products/data";
import { SupplierBottomNav } from "../_components/bottom-nav";
import { ProductsClient } from "./products-client";
import { ToothPricesForm } from "./tooth-prices-form";
import { CheckIcon } from "@/app/_components/icons";
import { SectionHeader } from "@/app/_components/section-header";

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
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[7.5rem] pt-1.5">
      <h1 className="px-1 pt-1 text-large-title font-bold text-ink">Products</h1>
      <p className="px-1 text-list-secondary text-ink-muted">What you sell, and what you charge for it.</p>

      <section aria-labelledby="teeth-heading">
        <SectionHeader>
          <span id="teeth-heading">Teeth</span>
        </SectionHeader>
        <ToothPricesForm
          frasacoPrice={supplier.frasacoPrice}
          copyAPrice={supplier.copyAPrice}
          disabled={supplier.status === "suspended"}
        />
      </section>

      <section className="mt-3" aria-labelledby="extras-heading">
        <SectionHeader>
          <span id="extras-heading">Extras</span>
        </SectionHeader>
        <p className="mx-1 -mt-0.5 text-native-caption text-ink-muted">
          Students add these to their weekly order with you, beside their teeth. The switch says whether one is in stock.
        </p>
        {justDone && doneLabel && (
          <p
            role="status"
            className="note-in mt-3 flex items-center gap-2 rounded-field bg-fill px-3.5 py-2.5 text-list-secondary text-ink"
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

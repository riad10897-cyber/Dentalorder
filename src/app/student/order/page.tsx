import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults } from "@/lib/student/data";
import { getSupplierFresh } from "@/lib/supplier/directory";
import { listOrderableProducts } from "@/lib/products/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { OrderBuilder } from "./order-builder";

/**
 * The chart, for one supplier.
 *
 * Who you are buying from is chosen on Home, so it arrives here in the
 * URL. An unknown or missing supplier goes back to the market rather than
 * guessing — the prices on this screen have to belong to somebody.
 */
export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const { supplier: supplierId } = await searchParams;
  if (!supplierId) redirect("/student");

  // Prices read now, not from the cached market list: they are what the
  // chart totals up and what the database will be asked to confirm. From
  // a cache, a refused order would reload the same stale price and be
  // refused again.
  const [student, orderDefaults, supplier, products] = await Promise.all([
    getStudentContext(userId),
    getOrderDefaults(userId),
    getSupplierFresh(supplierId),
    listOrderableProducts(supplierId),
  ]);
  if (!student) redirect("/sign-in");
  if (!supplier || supplier.id === userId) redirect("/student");

  // No bottom nav on this screen: the pinned order footer occupies that
  // space, and stacking both leaves too little chart at 375px. The back
  // link is the way out.
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <div className="flex items-center gap-3 px-5 pt-5">
        <Link
          href="/student"
          className="pressable -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-control"
          aria-label="Back to the market"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-title">{supplier.displayName}</h1>
          <p className="tnum truncate text-caption text-ink-muted">
            Frasaco ${supplier.frasacoPrice.toFixed(2)} · Copy A ${supplier.copyAPrice.toFixed(2)}
          </p>
        </div>
      </div>

      <OrderBuilder
        supplierId={supplier.id}
        supplierName={supplier.displayName}
        frasacoPrice={supplier.frasacoPrice}
        copyAPrice={supplier.copyAPrice}
        initialWeek={orderDefaults.nextWeek}
        initialToothType={orderDefaults.lastToothType}
        extras={products.map((p) => ({
          productId: p.id,
          name: p.name,
          unit: p.unit,
          brand: p.brand,
          description: p.description,
          price: p.price,
          category: p.category,
        }))}
      />
    </main>
  );
}

import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults } from "@/lib/student/data";
import { getSupplierFresh } from "@/lib/supplier/directory";
import { PushedHeader } from "@/app/_components/settings/menu";
import { TypePrices } from "@/app/_components/type-prices";
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
      <PushedHeader
        backHref="/student"
        backLabel="Back to the market"
        title={supplier.displayName}
        subtitle={<TypePrices frasacoPrice={supplier.frasacoPrice} copyAPrice={supplier.copyAPrice} />}
      />

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

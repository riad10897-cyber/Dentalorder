import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults, getReorderSource } from "@/lib/student/data";
import { toothSelectionKey, type ToothSelections } from "@/lib/teeth/selection";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
import { getSupplierFresh } from "@/lib/supplier/directory";
import { PushedHeader } from "@/app/_components/settings/menu";
import { listOrderableProducts } from "@/lib/products/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { OrderBuilder } from "./order-builder";
import { deadlineLabel } from "@/lib/orders/ordering-week";

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
  searchParams: Promise<{ supplier?: string; from?: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const { supplier: supplierId, from } = await searchParams;
  if (!supplierId) redirect("/student");

  // Prices read now, not from the cached market list: they are what the
  // chart totals up and what the database will be asked to confirm. From
  // a cache, a refused order would reload the same stale price and be
  // refused again.
  const [student, orderDefaults, supplier, products, source] = await Promise.all([
    getStudentContext(userId),
    getOrderDefaults(userId),
    getSupplierFresh(supplierId),
    listOrderableProducts(supplierId),
    from && UUID.test(from) ? getReorderSource(userId, from) : Promise.resolve(null),
  ]);
  if (!student) redirect("/sign-in");
  if (!supplier || supplier.id === userId) redirect("/student");

  // Reorder: the earlier order's lines, priced today by this screen like
  // any new order. Only from this seller; extras they no longer sell are
  // left out and named on the review.
  let prefill: React.ComponentProps<typeof OrderBuilder>["prefill"];
  if (source && source.supplierId === supplier.id) {
    const initialSelections: ToothSelections = {};
    for (const line of source.lines) {
      initialSelections[toothSelectionKey(line.toothNumber, line.toothType)] = {
        toothType: line.toothType,
        quantity: line.quantity,
      };
    }
    const onSale = new Set(products.map((p) => p.id));
    const initialExtras: Record<string, number> = {};
    const goneExtras: string[] = [];
    for (const extra of source.extras) {
      if (onSale.has(extra.productId)) initialExtras[extra.productId] = extra.quantity;
      else goneExtras.push(extra.name);
    }
    prefill = { initialSelections, initialExtras, goneExtras, openReview: true };
  }

  // No bottom nav on this screen: the pinned order footer occupies that
  // space, and stacking both leaves too little chart at 375px. The back
  // link is the way out.
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <PushedHeader native backText="Market"
        backHref="/student"
        backLabel="Back to the market"
        title={supplier.displayName}
      />

      <OrderBuilder
        supplierId={supplier.id}
        supplierName={supplier.displayName}
        frasacoPrice={supplier.frasacoPrice}
        copyAPrice={supplier.copyAPrice}
        initialWeek={orderDefaults.nextWeek}
        initialToothType={orderDefaults.lastToothType}
        deadline={deadlineLabel()}
        extras={products.map((p) => ({
          productId: p.id,
          name: p.name,
          unit: p.unit,
          brand: p.brand,
          description: p.description,
          price: p.price,
          category: p.category,
        }))}
        prefill={prefill}
      />
    </main>
  );
}

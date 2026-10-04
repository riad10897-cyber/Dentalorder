import { redirect } from "next/navigation";
import { getEditableOrder, getOrderDefaults } from "@/lib/student/data";
import { getSupplierFresh } from "@/lib/supplier/directory";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { priceMovesSinceOrder, productChangesSinceOrder } from "@/lib/orders/price-change";
import { PushedHeader } from "@/app/_components/settings/menu";
import { listOrderableProducts } from "@/lib/products/data";
import { OrderBuilder } from "../../order-builder";
import { toothSelectionKey, type ToothSelections } from "@/lib/teeth/selection";

/**
 * Edit a pending order: the same chart, opened on what was ordered.
 *
 * Same supplier and same week as the order — there is no control for
 * either. Prices are the supplier's current ones, because an edit is a new
 * quote; if they differ from what the order was bought at, the review
 * screen says so before anything is saved.
 */
export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const { orderId } = await params;
  const [order, defaults] = await Promise.all([
    getEditableOrder(userId, orderId),
    getOrderDefaults(userId),
  ]);

  // Not theirs, not pending any more, or already replaced: back to the
  // list, which shows where the order actually stands.
  if (!order) redirect("/student/orders");

  // Fresh, not the cached market list: the notice and the total the
  // database checks against must both be today's prices.
  const [supplier, products] = await Promise.all([
    getSupplierFresh(order.supplierId),
    listOrderableProducts(order.supplierId),
  ]);
  if (!supplier) {
    return (
      <main className="mx-auto min-h-dvh max-w-md">
        <PushedHeader backHref="/student/orders" backLabel="Back to orders" title="Edit order" />
        <p className="mx-5 mt-6 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          This supplier is not taking orders at the moment, so the order cannot be changed. It
          stays as you placed it.
        </p>
      </main>
    );
  }

  const initialSelections: ToothSelections = {};
  for (const line of order.lines) {
    initialSelections[toothSelectionKey(line.toothNumber, line.toothType)] = {
      toothType: line.toothType,
      quantity: line.quantity,
    };
  }

  // Extras: what the order had, against what the seller sells now. A
  // product gone since is left off and named on the review screen.
  const productChanges = productChangesSinceOrder(
    order.extras,
    products.map((p) => ({ productId: p.id, price: p.price })),
  );
  const availableIds = new Set(products.map((p) => p.id));
  const initialExtras: Record<string, number> = {};
  for (const extra of order.extras) {
    if (availableIds.has(extra.productId)) initialExtras[extra.productId] = extra.quantity;
  }

  const priceMoves = priceMovesSinceOrder(order.lines, {
    frasacoPrice: supplier.frasacoPrice,
    copyAPrice: supplier.copyAPrice,
  });

  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <PushedHeader
        backHref="/student/orders"
        backLabel="Back to orders"
        title="Edit order"
        subtitle={supplier.displayName}
      />

      <OrderBuilder
        supplierId={supplier.id}
        supplierName={supplier.displayName}
        frasacoPrice={supplier.frasacoPrice}
        copyAPrice={supplier.copyAPrice}
        initialWeek={order.weekNumber}
        initialToothType={defaults.lastToothType}
        extras={products.map((p) => ({
          productId: p.id,
          name: p.name,
          unit: p.unit,
          brand: p.brand,
          description: p.description,
          price: p.price,
          category: p.category,
        }))}
        edit={{
          orderId: order.id,
          originalTotal: order.totalPrice,
          priceMoves,
          productMoves: productChanges.moves,
          goneExtras: productChanges.gone,
          initialSelections,
          initialExtras,
        }}
      />
    </main>
  );
}

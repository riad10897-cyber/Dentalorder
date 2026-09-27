import Link from "next/link";
import { redirect } from "next/navigation";
import { getEditableOrder, getOrderDefaults } from "@/lib/student/data";
import { getSupplierFresh } from "@/lib/supplier/directory";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { priceMovesSinceOrder } from "@/lib/orders/price-change";
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
  const supplier = await getSupplierFresh(order.supplierId);
  if (!supplier) {
    return (
      <main className="mx-auto min-h-dvh max-w-md px-5 pt-6">
        <BackLink />
        <p className="mt-6 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
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

  const priceMoves = priceMovesSinceOrder(order.lines, {
    frasacoPrice: supplier.frasacoPrice,
    copyAPrice: supplier.copyAPrice,
  });

  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <div className="flex items-center gap-3 px-5 pt-5">
        <BackLink />
        <div className="min-w-0">
          <h1 className="truncate font-display text-title">Edit order</h1>
          <p className="tnum truncate text-caption text-ink-muted">
            {supplier.displayName} · Frasaco ${supplier.frasacoPrice.toFixed(2)} · Copy A $
            {supplier.copyAPrice.toFixed(2)}
          </p>
        </div>
      </div>

      <OrderBuilder
        supplierId={supplier.id}
        supplierName={supplier.displayName}
        frasacoPrice={supplier.frasacoPrice}
        copyAPrice={supplier.copyAPrice}
        initialWeek={order.weekNumber}
        initialToothType={defaults.lastToothType}
        edit={{
          orderId: order.id,
          originalTotal: order.totalPrice,
          priceMoves,
          initialSelections,
        }}
      />
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/student/orders"
      className="pressable -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-control"
      aria-label="Back to orders"
    >
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </Link>
  );
}

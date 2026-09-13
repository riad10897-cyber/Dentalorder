import { test } from "node:test";
import assert from "node:assert/strict";
import { priceToothItem, priceToothOrder, unitPriceFor } from "./tooth-pricing";

const PRICES = { frasacoPrice: 2.5, copyAPrice: 1.2 };

test("unitPriceFor picks the price matching the tooth type", () => {
  assert.equal(unitPriceFor("frasaco", PRICES), 2.5);
  assert.equal(unitPriceFor("copy_a", PRICES), 1.2);
});

test("priceToothItem computes line_total as quantity * unit_price", () => {
  const priced = priceToothItem({ toothNumber: 11, toothType: "frasaco", quantity: 4 }, PRICES);
  assert.equal(priced.unitPrice, 2.5);
  assert.equal(priced.lineTotal, 10);
});

test("priceToothOrder sums line totals into a subtotal across mixed types", () => {
  const { items, subtotal } = priceToothOrder(
    [
      { toothNumber: 11, toothType: "frasaco", quantity: 2 }, // 5.00
      { toothNumber: 36, toothType: "copy_a", quantity: 3 }, // 3.60
    ],
    PRICES,
  );
  assert.equal(items[0].lineTotal, 5);
  assert.equal(items[1].lineTotal, 3.6);
  assert.equal(subtotal, 8.6);
});

test("priceToothOrder with an empty order is a zero subtotal, not an error", () => {
  const { items, subtotal } = priceToothOrder([], PRICES);
  assert.deepEqual(items, []);
  assert.equal(subtotal, 0);
});

test("a rep's current prices are what get quoted, not any price baked into the input", () => {
  // Simulates re-pricing an old order's line shape against new rep prices —
  // this is exactly what reorder does: same teeth, current prices.
  const oldOrderShape = [{ toothNumber: 14, toothType: "frasaco" as const, quantity: 1 }];
  const before = priceToothOrder(oldOrderShape, PRICES);
  const after = priceToothOrder(oldOrderShape, { frasacoPrice: 3.0, copyAPrice: 1.2 });
  assert.equal(before.subtotal, 2.5);
  assert.equal(after.subtotal, 3.0);
});

test("rounds to the cent like numeric(10,2) in the database", () => {
  const priced = priceToothItem(
    { toothNumber: 11, toothType: "frasaco", quantity: 3 },
    { frasacoPrice: 0.1, copyAPrice: 0.1 },
  );
  // 0.1 * 3 is 0.30000000000000004 in floating point.
  assert.equal(priced.lineTotal, 0.3);
});

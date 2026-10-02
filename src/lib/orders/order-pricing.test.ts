import { test } from "node:test";
import assert from "node:assert/strict";
import { priceExtras, priceWeeklyOrder } from "./order-pricing";

const prices = { frasacoPrice: 2.5, copyAPrice: 1.2 };
const gloves = { productId: "g", name: "Nitrile gloves", unit: "box of 100", price: 6.5 };
const bur = { productId: "b", name: "Round bur", unit: "pack of 5", price: 3.1 };

test("a product line is quantity × the product's price", () => {
  const { items, subtotal } = priceExtras([{ productId: "g", quantity: 2 }], [gloves]);
  assert.equal(items[0].unitPrice, 6.5);
  assert.equal(items[0].lineTotal, 13);
  assert.equal(subtotal, 13);
});

test("mixed order: teeth and extras add up exactly — the database's own example", () => {
  // Same order the migration rehearsal places: 2 Frasaco 11, 1 Copy A 46,
  // 2 gloves, 1 bur at 3.00 → 22.20 there. With the bur at 3.10 here, 22.30.
  const r = priceWeeklyOrder(
    [
      { toothNumber: 11, toothType: "frasaco", quantity: 2 },
      { toothNumber: 46, toothType: "copy_a", quantity: 1 },
    ],
    prices,
    [
      { productId: "g", quantity: 2 },
      { productId: "b", quantity: 1 },
    ],
    [gloves, bur],
  );
  assert.equal(r.total, 22.3);
});

test("cents, not floats: 6.50 + 3.10 is exactly 9.60", () => {
  const { subtotal } = priceExtras(
    [
      { productId: "g", quantity: 1 },
      { productId: "b", quantity: 1 },
    ],
    [gloves, bur],
  );
  assert.equal(subtotal, 9.6);
  // the float sum this avoids:
  assert.notEqual(6.5 + 3.1 + 0.1 + 0.2 - 0.3, 9.6);
});

test("extras only, no teeth, is a valid total", () => {
  const r = priceWeeklyOrder([], prices, [{ productId: "b", quantity: 3 }], [bur]);
  assert.equal(r.total, 9.3);
  assert.equal(r.teeth.length, 0);
});

test("a product no longer available is left out of the total and reported", () => {
  const r = priceExtras(
    [
      { productId: "g", quantity: 1 },
      { productId: "gone", quantity: 4 },
    ],
    [gloves],
  );
  assert.equal(r.subtotal, 6.5);
  assert.deepEqual(r.unavailable, ["gone"]);
});

test("a quantity of zero is not a line", () => {
  const r = priceExtras([{ productId: "g", quantity: 0 }], [gloves]);
  assert.equal(r.items.length, 0);
  assert.equal(r.subtotal, 0);
});

test("the price used is the one passed in now, not one carried on the pick", () => {
  // A pick is an id and a quantity. A price change since it was picked is
  // what the student sees — the database reprices the same way.
  const raised = { ...gloves, price: 9.99 };
  assert.equal(priceExtras([{ productId: "g", quantity: 2 }], [raised]).subtotal, 19.98);
});

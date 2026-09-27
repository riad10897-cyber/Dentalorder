import { test } from "node:test";
import assert from "node:assert/strict";
import { priceMovesSinceOrder } from "./price-change";

const now = { frasacoPrice: 2.5, copyAPrice: 1.2 };

test("same prices: nothing to say", () => {
  const lines = [
    { toothType: "frasaco" as const, unitPrice: 2.5 },
    { toothType: "copy_a" as const, unitPrice: 1.2 },
  ];
  assert.deepEqual(priceMovesSinceOrder(lines, now), []);
});

test("a raised Frasaco price is reported with both figures", () => {
  const lines = [{ toothType: "frasaco" as const, unitPrice: 2.5 }];
  assert.deepEqual(priceMovesSinceOrder(lines, { frasacoPrice: 9.99, copyAPrice: 1.2 }), [
    { toothType: "frasaco", was: 2.5, now: 9.99 },
  ]);
});

test("a price that went down is still a change", () => {
  const lines = [{ toothType: "copy_a" as const, unitPrice: 1.2 }];
  assert.deepEqual(priceMovesSinceOrder(lines, { frasacoPrice: 2.5, copyAPrice: 1.0 }), [
    { toothType: "copy_a", was: 1.2, now: 1.0 },
  ]);
});

test("a type the order never had cannot have 'changed since you ordered'", () => {
  // Frasaco only on the order; Copy A moved. There is no old Copy A price
  // on this order to compare against, so nothing is claimed.
  const lines = [{ toothType: "frasaco" as const, unitPrice: 2.5 }];
  assert.deepEqual(priceMovesSinceOrder(lines, { frasacoPrice: 2.5, copyAPrice: 3.0 }), []);
});

test("both types moved: both reported, Frasaco first", () => {
  const lines = [
    { toothType: "copy_a" as const, unitPrice: 1.2 },
    { toothType: "frasaco" as const, unitPrice: 2.5 },
  ];
  assert.deepEqual(priceMovesSinceOrder(lines, { frasacoPrice: 9.99, copyAPrice: 7.77 }), [
    { toothType: "frasaco", was: 2.5, now: 9.99 },
    { toothType: "copy_a", was: 1.2, now: 7.77 },
  ]);
});

test("2.5 and 2.50 are the same price — compared in cents, not as floats", () => {
  const lines = [{ toothType: "frasaco" as const, unitPrice: Number("2.50") }];
  assert.deepEqual(priceMovesSinceOrder(lines, { frasacoPrice: 2.5, copyAPrice: 1.2 }), []);
  // and float noise from arithmetic is not a price change either
  const noisy = [{ toothType: "frasaco" as const, unitPrice: 0.1 + 0.2 }];
  assert.deepEqual(priceMovesSinceOrder(noisy, { frasacoPrice: 0.3, copyAPrice: 1.2 }), []);
});

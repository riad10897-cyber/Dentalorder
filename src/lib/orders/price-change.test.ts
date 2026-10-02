import { test } from "node:test";
import assert from "node:assert/strict";
import { priceMovesSinceOrder, productChangesSinceOrder } from "./price-change";

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


test("extras: same prices, all still sold — nothing to say", () => {
  assert.deepEqual(
    productChangesSinceOrder([{ productId: "g", name: "Gloves", unitPrice: 6.5 }], [{ productId: "g", price: 6.5 }]),
    { moves: [], gone: [] },
  );
});

test("extras: a repriced product is reported with both figures", () => {
  assert.deepEqual(
    productChangesSinceOrder([{ productId: "g", name: "Gloves", unitPrice: 6.5 }], [{ productId: "g", price: 7.25 }]),
    { moves: [{ name: "Gloves", was: 6.5, now: 7.25 }], gone: [] },
  );
});

test("extras: a product no longer on sale is named as gone, not priced", () => {
  assert.deepEqual(
    productChangesSinceOrder(
      [
        { productId: "g", name: "Gloves", unitPrice: 6.5 },
        { productId: "m", name: "Masks", unitPrice: 4 },
      ],
      [{ productId: "g", price: 6.5 }],
    ),
    { moves: [], gone: ["Masks"] },
  );
});

test("extras: compared in cents, so 6.5 and 6.50 are one price", () => {
  assert.deepEqual(
    productChangesSinceOrder([{ productId: "g", name: "Gloves", unitPrice: Number("6.50") }], [{ productId: "g", price: 6.5 }]),
    { moves: [], gone: [] },
  );
});

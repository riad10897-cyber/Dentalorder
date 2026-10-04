import { test } from "node:test";
import assert from "node:assert/strict";
import { productInputSchema } from "./products";

const base = { name: "Nitrile gloves, M", category: "gloves-masks", price: "6.50" };

test("brand and description are optional, and blank means none", () => {
  const parsed = productInputSchema.parse({ ...base, brand: "   ", description: "" });
  assert.equal(parsed.brand, null);
  assert.equal(parsed.description, null);
  assert.equal(productInputSchema.parse(base).brand, null);
});

test("brand and description are trimmed", () => {
  const parsed = productInputSchema.parse({ ...base, brand: " Dentsply ", description: " Powder-free. " });
  assert.equal(parsed.brand, "Dentsply");
  assert.equal(parsed.description, "Powder-free.");
});

test("brand stops at 60 characters, description at 300", () => {
  assert.equal(productInputSchema.safeParse({ ...base, brand: "b".repeat(60) }).success, true);
  assert.equal(productInputSchema.safeParse({ ...base, brand: "b".repeat(61) }).success, false);
  assert.equal(productInputSchema.safeParse({ ...base, description: "d".repeat(300) }).success, true);
  assert.equal(productInputSchema.safeParse({ ...base, description: "d".repeat(301) }).success, false);
});

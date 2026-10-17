import { test } from "node:test";
import assert from "node:assert/strict";
import { totalBefore, totalWithout } from "./unavailable";

// 14 Frasaco ×1, 36 Copy A ×2, 47 Frasaco ×1 at 2.50 / 1.20.
const lines = [
  { lineId: "14", lineTotal: 2.5 },
  { lineId: "36", lineTotal: 2.4 },
  { lineId: "47", lineTotal: 2.5 },
];

test("taking 14 off leaves the other lines at the prices charged", () => {
  assert.equal(totalWithout(lines, new Set(["14"])), 4.9);
});

test("taking nothing off leaves the total as it was", () => {
  assert.equal(totalWithout(lines, new Set()), 7.4);
});

test("sums are exact to the cent", () => {
  const awkward = [
    { lineId: "a", lineTotal: 0.1 },
    { lineId: "b", lineTotal: 0.2 },
    { lineId: "c", lineTotal: 6.5 },
  ];
  assert.equal(totalWithout(awkward, new Set(["c"])), 0.3);
});

test("the total before is the new total plus what was taken off", () => {
  assert.equal(totalBefore(4.9, [{ line_total: 2.5 }]), 7.4);
  assert.equal(totalBefore(2.4, [{ line_total: 2.5 }, { line_total: "2.50" }]), 7.4);
});

test("matches the database rehearsal: 7.40 → 4.90 → 2.40", () => {
  assert.equal(totalWithout(lines, new Set(["14"])), 4.9);
  assert.equal(totalWithout(lines, new Set(["14", "47"])), 2.4);
});

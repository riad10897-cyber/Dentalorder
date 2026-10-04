import { test } from "node:test";
import assert from "node:assert/strict";
import { currentWeekSchema } from "./orders";

test("a seller's week is a whole number from 1 to 17", () => {
  for (const ok of [1, 4, 17]) assert.equal(currentWeekSchema.safeParse(ok).success, true);
  for (const bad of [0, 18, 4.5, -1, "4", null]) assert.equal(currentWeekSchema.safeParse(bad).success, false);
});

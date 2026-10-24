import { test } from "node:test";
import assert from "node:assert/strict";
import { ordinal, streakNote } from "./streak";
import { orderingWeekIndex } from "./ordering-week";

test("a first ever order is its own moment", () => {
  assert.deepEqual(streakNote([40], 40), { kind: "first" });
});

test("consecutive weeks make a streak", () => {
  assert.deepEqual(streakNote([38, 39, 40], 40), { kind: "streak", weeks: 3, milestone: false });
});

test("two orders in one week count as one week", () => {
  assert.deepEqual(streakNote([39, 40, 40], 40), { kind: "streak", weeks: 2, milestone: false });
});

test("a gap starts it again, quietly", () => {
  assert.deepEqual(streakNote([36, 37, 40], 40), { kind: "none" });
  assert.deepEqual(streakNote([36, 37, 39, 40], 40), { kind: "streak", weeks: 2, milestone: false });
});

test("5, 10 and 15 weeks are milestones", () => {
  assert.equal((streakNote([36, 37, 38, 39, 40], 40) as { milestone: boolean }).milestone, true);
  assert.equal((streakNote([37, 38, 39, 40], 40) as { milestone: boolean }).milestone, false);
});

test("a second order in the student's first week is not a 'first order'", () => {
  assert.deepEqual(streakNote([40, 40], 40), { kind: "none" });
});

test("weeks turn over at Saturday 5:00 PM Beirut", () => {
  // 4:59 and 5:00 PM Beirut on Saturday 10 Oct 2026 (UTC+3).
  assert.equal(orderingWeekIndex(new Date("2026-10-10T14:00:00Z")) - orderingWeekIndex(new Date("2026-10-10T13:59:00Z")), 1);
});

test("ordinals", () => {
  assert.deepEqual([1, 2, 3, 5, 11, 12, 13, 21].map(ordinal), ["1st", "2nd", "3rd", "5th", "11th", "12th", "13th", "21st"]);
});

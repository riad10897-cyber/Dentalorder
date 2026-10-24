import { test } from "node:test";
import assert from "node:assert/strict";
import { deadlineLabel, effectiveWeek, nextSwitchLabel } from "./ordering-week";

// The same cases the SQL (public.effective_week) was checked against.
const setSunday = new Date("2026-10-04T09:00:00Z"); // Sun 4 Oct, 12:00 Beirut (summer time)

test("the week moves on at Saturday 5:00 PM Beirut, not a second before", () => {
  assert.equal(effectiveWeek(4, setSunday, new Date("2026-10-10T13:59:59Z")), 4);
  assert.equal(effectiveWeek(4, setSunday, new Date("2026-10-10T14:00:00Z")), 5);
});

test("1:00 PM Saturday is no longer the switch", () => {
  assert.equal(effectiveWeek(4, setSunday, new Date("2026-10-10T10:30:00Z")), 4); // 1:30 PM Beirut
});

test("winter time keeps the switch at 5:00 PM local", () => {
  assert.equal(effectiveWeek(4, setSunday, new Date("2026-11-07T14:30:00Z")), 8); // 4:30 PM Beirut
  assert.equal(effectiveWeek(4, setSunday, new Date("2026-11-07T15:00:00Z")), 9); // 5:00 PM Beirut
});

test("a week set just before or just after the switch", () => {
  assert.equal(effectiveWeek(4, new Date("2026-10-10T13:59:00Z"), new Date("2026-10-10T14:00:00Z")), 5);
  assert.equal(effectiveWeek(4, new Date("2026-10-10T14:01:00Z"), new Date("2026-10-10T20:00:00Z")), 4);
});

test("the semester stops at week 17", () => {
  assert.equal(effectiveWeek(4, setSunday, new Date("2027-06-01T00:00:00Z")), 17);
});

test("deadline and switch are told in Beirut time", () => {
  const sunday = new Date("2026-10-04T20:00:00Z");
  assert.equal(nextSwitchLabel(sunday), "Saturday 10 Oct, 5:00 PM");
  assert.equal(deadlineLabel(sunday), "Saturday 10 Oct, 4:50 PM");
  // Saturday 4:55 PM Beirut: still this week's deadline, already passed by 5 minutes.
  assert.equal(deadlineLabel(new Date("2026-10-10T13:55:00Z")), "Saturday 10 Oct, 4:50 PM");
  // Saturday 5:00 PM Beirut: the next week's.
  assert.equal(deadlineLabel(new Date("2026-10-10T14:00:00Z")), "Saturday 17 Oct, 4:50 PM");
});

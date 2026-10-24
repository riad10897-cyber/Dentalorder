import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDay, formatMoment, timeAgo } from "./time";

// 3 pm Beirut, Saturday 10 Oct 2026 (UTC+3).
const now = new Date("2026-10-10T12:00:00Z");

test("recent things are relative", () => {
  assert.equal(timeAgo("2026-10-10T11:59:40Z", now), "just now");
  assert.equal(timeAgo("2026-10-10T11:55:00Z", now), "5 min ago");
  assert.equal(timeAgo("2026-10-10T09:00:00Z", now), "3 h ago");
});

test("yesterday, then a date — in Beirut, not UTC", () => {
  assert.equal(timeAgo("2026-10-09T20:00:00Z", now), "yesterday");
  // 11:30 pm Beirut on 7 Oct is 8:30 pm UTC the same day.
  assert.equal(timeAgo("2026-10-07T20:30:00Z", now), "7 Oct");
  // 1 am Beirut on 8 Oct is still 7 Oct in UTC.
  assert.equal(formatDay("2026-10-07T22:00:00Z"), "8 Oct");
});

test("timeline moments: today, yesterday, weekday, then a date", () => {
  assert.equal(formatMoment("2026-10-10T06:12:00Z", now), "Today at 9:12 AM");
  assert.equal(formatMoment("2026-10-09T14:00:00Z", now), "Yesterday at 5:00 PM");
  // Monday 5 Oct, 5:00 PM Beirut.
  assert.equal(formatMoment("2026-10-05T14:00:00Z", now), "Monday at 5:00 PM");
  assert.equal(formatMoment("2026-10-01T14:00:00Z", now), "1 Oct at 5:00 PM");
});


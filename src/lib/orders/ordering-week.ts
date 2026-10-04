/*
 * Ordering weeks run from Saturday 1:00 PM to the next Saturday 1:00 PM,
 * Beirut time. Students are told to order by 12:50 PM; anything placed
 * before 1:00 PM still goes into that week.
 *
 * The same rule lives in the database (public.effective_week), which is
 * what actually files each order. This copy only decides what screens
 * say, and its tests use the same dates as the SQL's.
 */

const TIME_ZONE = "Asia/Beirut";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// A Saturday 1:00 PM, as Beirut wall-clock time. Only differences matter.
const ANCHOR_LOCAL_MS = Date.UTC(2026, 0, 3, 13, 0);
/** How long before the switch students are asked to have ordered. */
export const DEADLINE_LEAD_MINUTES = 10;
export const LAST_WEEK = 17;

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** The Beirut wall-clock time of an instant, written as if it were UTC. */
function beirutWallClockMs(at: Date): number {
  const p: Record<string, number> = {};
  for (const part of partsFormat.formatToParts(at)) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

function weekIndex(at: Date): number {
  return Math.floor((beirutWallClockMs(at) - ANCHOR_LOCAL_MS) / WEEK_MS);
}

/** The week a seller is on now: the week they set, plus one per Saturday 1:00 PM since. */
export function effectiveWeek(week: number, setAt: Date, at: Date = new Date()): number {
  return Math.min(LAST_WEEK, Math.max(1, week + weekIndex(at) - weekIndex(setAt)));
}

const wallClockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatWallClock(localMs: number): string {
  // "Saturday 10 Oct, 12:50 pm" → "Saturday 10 Oct, 12:50 PM"
  return wallClockFormat.format(new Date(localMs)).replace(/\b(am|pm)\b/, (m) => m.toUpperCase());
}

/** When this ordering week ends and the next begins: "Saturday 10 Oct, 1:00 PM". */
export function nextSwitchLabel(at: Date = new Date()): string {
  return formatWallClock(ANCHOR_LOCAL_MS + (weekIndex(at) + 1) * WEEK_MS);
}

/**
 * Orders placed in a week are handed over the week after: week 4's orders
 * reach students in week 5. After week 17 there is no numbered week, so
 * it reads "the week after".
 */
export function handOverWeek(orderWeek: number): string {
  return orderWeek < LAST_WEEK ? `week ${orderWeek + 1}` : "the week after";
}

/** What students are told to order by: "Saturday 10 Oct, 12:50 PM". */
export function deadlineLabel(at: Date = new Date()): string {
  return formatWallClock(ANCHOR_LOCAL_MS + (weekIndex(at) + 1) * WEEK_MS - DEADLINE_LEAD_MINUTES * 60 * 1000);
}

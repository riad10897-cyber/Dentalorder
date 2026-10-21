// One way to say when something happened, everywhere in the app:
// "just now", "5 min ago", "3 h ago", "yesterday", then "10 Oct".
// Dates are Beirut dates, so a late-night order lands on the right day.

const TZ = "Asia/Beirut";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (dayKey(then) === dayKey(now)) return `${Math.floor(minutes / 60)} h ago`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey(then) === dayKey(yesterday)) return "yesterday";
  return formatDay(iso);
}

// The weekly ordering streak shown on the confirmation screen.
//
// Counted in ordering weeks (Saturday 1:00 PM to Saturday 1:00 PM, Beirut),
// from when each order was placed, across every seller: it is the student's
// habit, not any one seller's. Cancelled and rejected orders don't count.
// A missed week simply starts it again; nothing ever says it was lost.

export type StreakNote =
  | { kind: "none" }
  | { kind: "first" }
  | { kind: "streak"; weeks: number; milestone: boolean };

const MILESTONES = new Set([5, 10, 15]);

/**
 * @param weeks ordering-week indexes of the student's live orders, the
 *   one just placed included
 * @param current the week index of the order just placed
 */
export function streakNote(weeks: number[], current: number): StreakNote {
  const set = new Set(weeks);
  if (!set.has(current)) return { kind: "none" };
  if (set.size === 1 && weeks.length === 1) return { kind: "first" };

  let run = 1;
  while (set.has(current - run)) run += 1;
  if (run < 2) return { kind: "none" };
  return { kind: "streak", weeks: run, milestone: MILESTONES.has(run) };
}

/** 5th, 10th, 15th: ordinals for the milestones, and any other number. */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

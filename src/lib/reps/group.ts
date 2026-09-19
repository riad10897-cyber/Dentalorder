import type { DirectoryRep } from "./directory";

export interface GroupedReps {
  mine: DirectoryRep[];
  others: DirectoryRep[];
  /** False until the student has a faculty to group by — render one flat list. */
  grouped: boolean;
}

function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Splits, never filters: every rep handed in comes back out in one bucket or
 * the other, so a student whose faculty has no rep — or who picked the wrong
 * one — can still reach everybody.
 */
export function groupRepsByUniversity(
  reps: DirectoryRep[],
  university: string | null | undefined,
): GroupedReps {
  const mineKey = normalise(university);
  if (!mineKey) return { mine: [], others: reps, grouped: false };

  const mine: DirectoryRep[] = [];
  const others: DirectoryRep[] = [];
  for (const rep of reps) {
    (normalise(rep.university) === mineKey ? mine : others).push(rep);
  }
  return { mine, others, grouped: true };
}

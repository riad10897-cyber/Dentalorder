import type { DirectorySupplier } from "./directory";

export interface GroupedSuppliers {
  mine: DirectorySupplier[];
  others: DirectorySupplier[];
  /** False until the student has a faculty to group by — render one flat list. */
  grouped: boolean;
}

function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Splits, never filters: every supplier handed in comes back out in one bucket
 * or the other, so a student whose faculty has no supplier — or who picked the wrong
 * one — can still reach everybody.
 */
export function groupSuppliersByUniversity(
  suppliers: DirectorySupplier[],
  university: string | null | undefined,
): GroupedSuppliers {
  const mineKey = normalise(university);
  if (!mineKey) return { mine: [], others: suppliers, grouped: false };

  const mine: DirectorySupplier[] = [];
  const others: DirectorySupplier[] = [];
  for (const supplier of suppliers) {
    (normalise(supplier.university) === mineKey ? mine : others).push(supplier);
  }
  return { mine, others, grouped: true };
}

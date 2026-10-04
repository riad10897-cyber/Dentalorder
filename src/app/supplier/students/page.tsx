import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupplierContext, listSupplierStudents } from "@/lib/supplier/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "../_components/bottom-nav";

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default async function SupplierStudentsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [rep, students] = await Promise.all([
    getSupplierContext(userId),
    listSupplierStudents(userId),
  ]);
  if (!rep) redirect("/sign-in");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <h1 className="font-display text-display">Students</h1>
        <p className="mt-1 text-small text-ink-muted">
          <span className="tnum">{students.length}</span>{" "}
          {students.length === 1 ? "student has" : "students have"} ordered from you.
        </p>
      </header>

      {students.length === 0 ? (
        <p className="mx-5 mt-6 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          No student has ordered from you yet. They appear here after their first order.
        </p>
      ) : (
        <ul className="mx-5 mt-5 overflow-hidden rounded-card border border-rule bg-card">
          {students.map((student) => (
            <li key={student.studentId} className="border-b border-hairline last:border-none">
              <Link
                href={`/supplier/students/${student.studentId}`}
                className="pressable flex min-h-12 items-center gap-3 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-sunk font-display text-small text-ink"
                >
                  {initials(student.fullName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-ink">{student.fullName}</span>
                  <span className="block text-caption text-ink-muted">
                    {student.lastWeekOrdered ? `Last: week ${student.lastWeekOrdered}` : "No orders yet"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tnum block font-display text-body">${student.totalSpent.toFixed(2)}</span>
                  <span className="tnum block text-caption text-ink-muted">
                    {student.orderCount} {student.orderCount === 1 ? "order" : "orders"}
                  </span>
                </span>
                <svg aria-hidden className="h-4 w-4 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SupplierBottomNav />
    </main>
  );
}

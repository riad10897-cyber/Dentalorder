import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupplierContext, listSupplierStudents } from "@/lib/supplier/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "../_components/bottom-nav";
import { EmptyState, PeopleIcon } from "@/app/_components/icons";
import { NativeChevron } from "@/app/_components/settings/menu";

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
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[7.5rem] pt-1.5">
      <h1 className="px-1 pt-1 text-large-title font-bold text-ink">Students</h1>
      <p className="px-1 text-list-secondary text-ink-muted">
        <span className="tnum">{students.length}</span>{" "}
        {students.length === 1 ? "student has" : "students have"} ordered from you.
      </p>

      {students.length === 0 ? (
        <EmptyState native molo icon={<PeopleIcon />} className="mt-5">
          No student has ordered from you yet. They appear here after their first order.
        </EmptyState>
      ) : (
        <ul className="mt-5 overflow-hidden rounded-group bg-card">
          {students.map((student) => (
            <li key={student.studentId} className="group">
              {/* The separator runs under the text only, inset past the
                  initials, as in an iOS list. */}
              <Link
                href={`/supplier/students/${student.studentId}`}
                className="pressable flex items-center gap-3 pl-4"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card-sunk text-list-secondary font-semibold text-ink"
                >
                  {initials(student.fullName)}
                </span>
                <span className="flex min-h-[3.75rem] min-w-0 flex-1 items-center gap-3 border-b-[0.5px] border-separator py-2.5 pr-4 group-last:border-none">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-native-body text-ink">{student.fullName}</span>
                    <span className="block text-list-secondary text-ink-faint">
                      {student.lastWeekOrdered ? `Last order: week ${student.lastWeekOrdered}` : "No orders yet"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="tnum block text-native-body font-semibold text-ink">
                      ${student.totalSpent.toFixed(2)}
                    </span>
                    <span className="tnum block text-native-caption text-ink-faint">
                      {student.orderCount} {student.orderCount === 1 ? "order" : "orders"}
                    </span>
                  </span>
                  <NativeChevron />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SupplierBottomNav />
    </main>
  );
}

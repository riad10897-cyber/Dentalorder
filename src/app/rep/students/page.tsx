import Link from "next/link";
import { redirect } from "next/navigation";
import { getRepContext, listRepStudents } from "@/lib/rep/data";
import { RepBottomNav } from "../_components/bottom-nav";

const AVATAR_COLORS = [
  { bg: "bg-ink/12", text: "text-ink" },
  { bg: "bg-copy-a/12", text: "text-copy-a" },
  { bg: "bg-ink/12", text: "text-ink" },
  { bg: "bg-warning/12", text: "text-ink-muted" },
];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

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

export default async function RepStudentsPage() {
  const rep = await getRepContext();
  if (!rep) redirect("/sign-in");

  const students = await listRepStudents(rep.userId);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="px-6 pt-5">
        <div className="text-[13px] text-ink-muted">{students.length} students assigned</div>
        <div className="font-display text-xl font-bold">Students</div>
      </div>

      {students.length === 0 ? (
        <div className="mx-6 mt-8 rounded-card border border-dashed border-rule p-6 text-center text-sm text-ink-muted">
          No students have picked you as their rep yet.
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2 px-6">
          {students.map((student) => {
            const color = colorFor(student.studentId);
            return (
              <Link
                key={student.studentId}
                href={`/rep/students/${student.studentId}`}
                className="flex items-center gap-3 rounded-lg border border-rule bg-card px-3.5 py-3"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-bold ${color.bg} ${color.text}`}
                >
                  {initials(student.fullName)}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">{student.fullName}</div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">
                    {student.lastWeekOrdered ? `Last: Week ${student.lastWeekOrdered}` : "No orders yet"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[15px] font-bold">
                    ${student.totalSpent.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-ink-muted">{student.orderCount} orders</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <RepBottomNav />
    </main>
  );
}

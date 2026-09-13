import { redirect } from "next/navigation";
import { getStudentContext, listStudentOrders } from "@/lib/student/data";
import { StudentBottomNav } from "../_components/bottom-nav";
import { signOut } from "@/app/actions/auth";

export default async function StudentProfilePage() {
  const student = await getStudentContext();
  if (!student) redirect("/sign-in");

  const orders = await listStudentOrders(student.userId);
  const totalTeeth = orders.reduce((sum, o) => sum + o.items.length, 0);
  const totalSpent = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  const metaParts = [student.university, student.yearOfStudy ? `Year ${student.yearOfStudy}` : null, student.section]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex items-center gap-4 px-6 pt-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent2 to-accent font-heading text-xl font-extrabold text-bg">
          {initials(student.fullName)}
        </div>
        <div>
          <div className="font-heading text-xl font-bold">{student.fullName}</div>
          {metaParts && <div className="mt-0.5 text-[13px] text-text-muted">{metaParts}</div>}
        </div>
      </div>

      <div className="mx-6 mt-6 grid grid-cols-3 gap-2.5">
        <StatCard value={String(orders.length)} label="Orders" />
        <StatCard value={String(totalTeeth)} label="Teeth" />
        <StatCard value={`$${totalSpent.toFixed(0)}`} label="Spent" />
      </div>

      {student.repName ? (
        <div className="mx-6 mt-4 flex items-center gap-3.5 rounded-card border border-border bg-surface p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent2/20 text-lg">
            👤
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-muted">
              Your Representative
            </div>
            <div className="font-heading text-[15px] font-bold">{student.repName}</div>
            <div className="mt-0.5 text-xs text-text-muted">
              Frasaco ${student.frasacoPrice.toFixed(2)} · Copy A ${student.copyAPrice.toFixed(2)}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-6 mt-4 rounded-card border border-dashed border-border p-4 text-center text-sm text-text-muted">
          No representative assigned yet.
        </div>
      )}

      <div className="px-6 pb-3 pt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Account
      </div>
      <form action={signOut} className="mx-6">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-surface px-4 py-3.5 text-sm font-medium text-text"
        >
          <span className="flex items-center gap-3">
            <span>🚪</span> Sign Out
          </span>
          <span className="text-text-muted">›</span>
        </button>
      </form>

      <StudentBottomNav />
    </main>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-3.5 text-center">
      <div className="font-heading text-[22px] font-extrabold text-accent">{value}</div>
      <div className="mt-0.5 text-[11px] text-text-muted">{label}</div>
    </div>
  );
}

function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

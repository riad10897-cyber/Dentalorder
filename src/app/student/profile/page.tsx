import { redirect } from "next/navigation";
import { getStudentContext, listStudentOrders, isSpend } from "@/lib/student/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { StudentBottomNav } from "../_components/bottom-nav";
import { signOut } from "@/app/actions/auth";

export default async function StudentProfilePage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [student, orders] = await Promise.all([
    getStudentContext(userId),
    listStudentOrders(userId),
  ]);
  if (!student) redirect("/sign-in");

  const counted = orders.filter(isSpend);
  // Teeth, not line items: three Frasaco 11s are three teeth, and one
  // line. items.length read as 1 and the stat is labelled "Teeth".
  const totalTeeth = counted.reduce(
    (sum, order) => sum + order.items.reduce((n, item) => n + item.quantity, 0),
    0,
  );
  const totalSpent = counted.reduce((sum, o) => sum + o.totalPrice, 0);

  const metaParts = [student.university, student.yearOfStudy ? `Year ${student.yearOfStudy}` : null, student.section]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="flex items-center gap-4 px-6 pt-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ink to-ink font-display text-xl font-extrabold text-card">
          {initials(student.fullName)}
        </div>
        <div>
          <div className="font-display text-xl font-bold">{student.fullName}</div>
          {metaParts && <div className="mt-0.5 text-[13px] text-ink-muted">{metaParts}</div>}
        </div>
      </div>

      <div className="mx-6 mt-6 grid grid-cols-3 gap-2.5">
        <StatCard value={String(orders.length)} label="Orders" />
        <StatCard value={String(totalTeeth)} label="Teeth" />
        <StatCard value={`$${totalSpent.toFixed(0)}`} label="Spent" />
      </div>

      <div className="px-6 pb-3 pt-6 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Account
      </div>
      <form action={signOut} className="mx-6">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-rule bg-card px-4 py-3.5 text-sm font-medium text-ink"
        >
          <span className="flex items-center gap-3">
            <span>🚪</span> Sign Out
          </span>
          <span className="text-ink-muted">›</span>
        </button>
      </form>

      <StudentBottomNav />
    </main>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-rule bg-card px-3 py-3.5 text-center">
      <div className="font-display text-[22px] font-extrabold text-ink">{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-muted">{label}</div>
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

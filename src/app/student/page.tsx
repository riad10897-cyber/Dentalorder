import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults } from "@/lib/student/data";
import { getSupplierDirectory } from "@/lib/supplier/directory";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { StudentBottomNav } from "./_components/bottom-nav";
import { MarketList } from "./_components/market-list";

/**
 * Home is the market.
 *
 * There is no dashboard before it and no "place this week's order" button:
 * the first thing a student does is choose who they are buying from, so
 * that is the first thing on the screen. Tapping a supplier opens the
 * chart at their prices.
 */
export default async function StudentHomePage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [student, { nextWeek }, suppliers] = await Promise.all([
    getStudentContext(userId),
    getOrderDefaults(userId),
    getSupplierDirectory(),
  ]);
  if (!student) redirect("/sign-in");

  // A supplier who is also a student cannot buy from themselves — the
  // database refuses it — so they are not offered the option.
  const market = suppliers.filter((s) => s.id !== userId);
  const firstName = student.fullName.split(" ")[0] || "there";

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <header className="px-5 pt-6">
        <p className="text-small text-ink-muted">Good to see you,</p>
        <h1 className="font-display text-display">{firstName}</h1>
        {/* The week is a line to keep count by, not something to set. */}
        <p className="mt-1 text-caption text-ink-muted">
          Week <span className="tnum">{nextWeek}</span> of <span className="tnum">17</span>
        </p>
      </header>

      <h2 className="px-5 pb-2 pt-6 text-micro uppercase text-ink-faint">Order from</h2>

      {market.length === 0 ? (
        <p className="mx-5 rounded-card border border-dashed border-rule px-4 py-6 text-center text-small text-ink-muted">
          No supplier is taking orders yet. As soon as someone in your year starts supplying, they
          will show up here.
        </p>
      ) : (
        <div className="mx-5">
          <MarketList suppliers={market} university={student.university} />
        </div>
      )}

      <StudentBottomNav />
    </main>
  );
}

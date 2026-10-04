import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults } from "@/lib/student/data";
import { getSupplierDirectory } from "@/lib/supplier/directory";
import { countOrderableBySupplier } from "@/lib/products/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { StudentBottomNav } from "./_components/bottom-nav";
import { MarketList } from "./_components/market-list";
import { EmptyState, StoreIcon } from "@/app/_components/icons";

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

  const [student, { nextWeek }, suppliers, extrasCounts] = await Promise.all([
    getStudentContext(userId),
    getOrderDefaults(userId),
    getSupplierDirectory(),
    countOrderableBySupplier(),
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
        <EmptyState icon={<StoreIcon />} className="mx-5">
          No supplier is taking orders yet. As soon as someone in your year starts supplying, they
          will show up here.
        </EmptyState>
      ) : (
        <div className="mx-5">
          <MarketList suppliers={market} university={student.university} extrasCounts={extrasCounts} />
        </div>
      )}

      <StudentBottomNav />
    </main>
  );
}

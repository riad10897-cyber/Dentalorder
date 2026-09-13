import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults, listAvailableReps } from "@/lib/student/data";
import { OrderBuilder } from "./order-builder";
import { StudentBottomNav } from "../_components/bottom-nav";
import { RepPicker } from "../_components/rep-picker";

export default async function NewOrderPage() {
  const student = await getStudentContext();
  if (!student) redirect("/sign-in");

  if (!student.repId) {
    const availableReps = await listAvailableReps();
    return (
      <main className="mx-auto min-h-dvh max-w-md px-6 pb-28 pt-5">
        <Header />
        <div className="mt-10 text-center text-sm text-text-muted">
          You&apos;ll need a representative before you can order teeth.
        </div>
        <div className="mt-4">
          <RepPicker reps={availableReps} />
        </div>
        <StudentBottomNav />
      </main>
    );
  }

  const { nextWeek, lastToothType } = await getOrderDefaults(student.userId);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="px-6 pt-5">
        <Header />
      </div>
      <OrderBuilder
        repName={student.repName}
        frasacoPrice={student.frasacoPrice}
        copyAPrice={student.copyAPrice}
        initialWeek={nextWeek}
        initialToothType={lastToothType}
      />
      <StudentBottomNav />
    </main>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-4">
      <Link
        href="/student"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        aria-label="Back"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>
      <div className="font-heading text-xl font-bold">New Order</div>
    </div>
  );
}

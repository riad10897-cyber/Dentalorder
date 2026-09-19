import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults, listAvailableReps } from "@/lib/student/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { OrderBuilder } from "./order-builder";
import { StudentBottomNav } from "../_components/bottom-nav";
import { RepPicker } from "../_components/rep-picker";

export default async function NewOrderPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  // Fetched together rather than one after the other: the order defaults
  // only ever needed the user id.
  const [student, orderDefaults] = await Promise.all([
    getStudentContext(userId),
    getOrderDefaults(userId),
  ]);
  if (!student) redirect("/sign-in");

  if (!student.repId) {
    const availableReps = await listAvailableReps();
    return (
      <main className="mx-auto min-h-dvh max-w-md px-5 pb-28 pt-5">
        <Header name={student.fullName} section={student.section} university={student.university} />
        <p className="mt-8 text-center text-small text-ink-muted">
          You&apos;ll need a representative before you can order teeth.
        </p>
        <div className="mt-4">
          <RepPicker reps={availableReps} university={student.university} />
        </div>
        <StudentBottomNav />
      </main>
    );
  }

  const { nextWeek, lastToothType } = orderDefaults;

  // No bottom nav on this screen: the pinned order footer occupies that
  // space, and stacking both leaves too little chart at 375px. The back
  // link is the way out.
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <div className="px-5 pt-5">
        <Header name={student.fullName} section={student.section} university={student.university} />
      </div>
      <OrderBuilder
        repName={student.repName}
        frasacoPrice={student.frasacoPrice}
        copyAPrice={student.copyAPrice}
        initialWeek={nextWeek}
        initialToothType={lastToothType}
      />
    </main>
  );
}

function Header({
  name,
  section,
  university,
}: {
  name: string;
  section: string | null;
  university: string | null;
}) {
  const meta = [university, section].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/student"
        className="pressable -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-control"
        aria-label="Back"
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>
      <div className="min-w-0">
        <h1 className="truncate font-display text-title">{name}</h1>
        {meta && <p className="truncate text-caption text-ink-muted">{meta}</p>}
      </div>
    </div>
  );
}

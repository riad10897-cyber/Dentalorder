import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentContext, getOrderDefaults } from "@/lib/student/data";
import { getSupplierDirectory } from "@/lib/supplier/directory";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierStep } from "./supplier-step";

export default async function NewOrderPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [student, orderDefaults, suppliers] = await Promise.all([
    getStudentContext(userId),
    getOrderDefaults(userId),
    getSupplierDirectory(),
  ]);
  if (!student) redirect("/sign-in");

  // A supplier can also be a student, and ordering from yourself is
  // refused by the database anyway — so they are not offered.
  const choices = suppliers.filter((s) => s.id !== userId);

  // No bottom nav on this screen: the pinned order footer occupies that
  // space, and stacking both leaves too little chart at 375px. The back
  // link is the way out.
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <div className="px-5 pt-5">
        <Header name={student.fullName} section={student.section} university={student.university} />
      </div>
      <SupplierStep
        suppliers={choices}
        university={student.university}
        initialWeek={orderDefaults.nextWeek}
        initialToothType={orderDefaults.lastToothType}
        lastSupplierId={orderDefaults.lastSupplierId}
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

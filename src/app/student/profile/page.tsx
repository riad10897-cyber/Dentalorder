import { redirect } from "next/navigation";
import { getStudentContext } from "@/lib/student/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { StudentBottomNav } from "../_components/bottom-nav";
import { signOut } from "@/app/actions/auth";
import { ProfileForm } from "./profile-form";

/**
 * Profile is what the student can change, and nothing else.
 *
 * The order and teeth counts went, and so did the spend total: a running
 * "you have spent $142" is a number nobody asked to be shown, it sits on
 * a screen they open to fix a typo in their phone number, and what they
 * owe is per order and lives on the order.
 */
export default async function StudentProfilePage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const student = await getStudentContext(userId);
  if (!student) redirect("/sign-in");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <h1 className="px-5 pt-6 font-display text-display">Profile</h1>

      <div className="mt-5 px-5">
        <ProfileForm
          fullName={student.fullName}
          phone={student.phone}
          university={student.university}
          yearOfStudy={student.yearOfStudy}
        />
      </div>

      <form action={signOut} className="mx-5 mt-8">
        <button
          type="submit"
          className="pressable flex min-h-11 w-full items-center justify-center rounded-control border border-rule bg-card px-4 py-3 font-display text-body text-ink"
        >
          Sign out
        </button>
      </form>

      <StudentBottomNav />
    </main>
  );
}

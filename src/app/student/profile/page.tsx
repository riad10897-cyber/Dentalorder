import { redirect } from "next/navigation";
import { getStudentContext } from "@/lib/student/data";
import { getVerifiedEmail, getVerifiedUserId } from "@/lib/supabase/auth";
import { StudentBottomNav } from "../_components/bottom-nav";
import {
  APP_VERSION,
  AccountHeader,
  MenuGroup,
  MenuInfo,
  MenuLink,
  SignOutRow,
  describeStudy,
} from "@/app/_components/settings/menu";

/**
 * Profile opens on a menu, like the settings of any app: who you are, then
 * rows that each open their own screen. Nothing here is a form.
 *
 * Still no spend total or order count: what a student owes is per order
 * and lives on the order.
 */
export default async function StudentProfilePage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [student, email] = await Promise.all([getStudentContext(userId), getVerifiedEmail()]);
  if (!student) redirect("/sign-in");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <h1 className="px-5 pt-6 font-display text-display">Profile</h1>

      <AccountHeader name={student.fullName || "Your account"} detail={describeStudy(student.university, student.yearOfStudy)} />

      <MenuGroup title="Account">
        <MenuLink href="/student/profile/details" label="Personal details" detail={student.phone ?? "Add your phone"} />
        {email && <MenuInfo label="Email" value={email} />}
        <MenuLink href="/student/profile/password" label="Password" detail="Change" />
      </MenuGroup>

      <MenuGroup title="Help" footnote="Something wrong with an order? Message your seller first.">
        <MenuInfo label="Questions about Dentora" value="Message Riad" />
        <MenuInfo label="Version" value={APP_VERSION} />
      </MenuGroup>

      <SignOutRow />

      <StudentBottomNav />
    </main>
  );
}


import { redirect } from "next/navigation";
import { ContactRow } from "@/app/_components/settings/contact-row";
import { InfoIcon, LockIcon, MailIcon, PersonIcon, QrIcon } from "@/app/_components/icons";
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
    <main className="mx-auto min-h-dvh max-w-md px-4 pb-[7.5rem] pt-1.5">
      <h1 className="px-1 pb-2.5 pt-1 text-large-title font-bold text-ink">Profile</h1>

      <AccountHeader native name={student.fullName || "Your account"} detail={describeStudy(student.university, student.yearOfStudy)} />

      <MenuGroup native title="Account">
        <MenuLink native href="/student/profile/details" label="Personal details" icon={<PersonIcon />} detail={student.phone ?? "Add your phone"} />
        {email && <MenuInfo native label="Email" value={email} icon={<MailIcon />} />}
        <MenuLink native href="/student/profile/password" label="Password" detail="Change" icon={<LockIcon />} />
      </MenuGroup>

      <MenuGroup native title="Share" footnote="Show the code in class, or send the link to your group.">
        <MenuLink native href="/student/profile/share" label="Share Molaro" detail="QR code" icon={<QrIcon />} />
      </MenuGroup>

      <MenuGroup native title="Help" footnote="Something wrong with an order? Message your seller first.">
        <ContactRow native />
        <MenuInfo native label="Version" value={APP_VERSION} icon={<InfoIcon />} />
      </MenuGroup>

      <SignOutRow native />

      <StudentBottomNav />
    </main>
  );
}


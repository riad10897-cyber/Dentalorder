import { redirect } from "next/navigation";
import { getStudentContext } from "@/lib/student/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { StudentBottomNav } from "../../_components/bottom-nav";
import { ProfileForm } from "@/app/_components/profile-form";
import { PushedHeader } from "@/app/_components/settings/menu";

export default async function StudentDetailsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");
  const student = await getStudentContext(userId);
  if (!student) redirect("/sign-in");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <PushedHeader native backText="Profile" backHref="/student/profile" backLabel="Back to profile" title="Personal details" />
      <div className="native-form mt-5 px-4">
        <ProfileForm
          fullName={student.fullName}
          phone={student.phone}
          university={student.university}
          yearOfStudy={student.yearOfStudy}
          phoneHint="Your supplier uses this to reach you about your order."
        />
      </div>
      <StudentBottomNav />
    </main>
  );
}

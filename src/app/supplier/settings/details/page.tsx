import { redirect } from "next/navigation";
import { getStudentContext } from "@/lib/student/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "../../_components/bottom-nav";
import { ProfileForm } from "@/app/_components/profile-form";
import { PushedHeader } from "@/app/_components/settings/menu";

export default async function SupplierDetailsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");
  const person = await getStudentContext(userId);
  if (!person) redirect("/sign-in");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <PushedHeader native backText="Settings" backHref="/supplier/settings" backLabel="Back to settings" title="Personal details" />
      <div className="native-form mt-5 px-4">
        <ProfileForm
          fullName={person.fullName}
          phone={person.phone}
          university={person.university}
          yearOfStudy={person.yearOfStudy}
          phoneHint="Students use this to reach you about their order."
        />
      </div>
      <SupplierBottomNav />
    </main>
  );
}

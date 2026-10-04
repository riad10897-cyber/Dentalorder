import { StudentBottomNav } from "../../_components/bottom-nav";
import { PushedHeader } from "@/app/_components/settings/menu";
import { PasswordForm } from "@/app/_components/settings/password-form";

export default function StudentPasswordPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <PushedHeader native backText="Profile" backHref="/student/profile" backLabel="Back to profile" title="Password" />
      <div className="mt-5 px-5">
        <PasswordForm />
      </div>
      <StudentBottomNav />
    </main>
  );
}

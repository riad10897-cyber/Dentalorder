import { SupplierBottomNav } from "../../_components/bottom-nav";
import { PushedHeader } from "@/app/_components/settings/menu";
import { PasswordForm } from "@/app/_components/settings/password-form";

export default function SupplierPasswordPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <PushedHeader backHref="/supplier/settings" backLabel="Back to settings" title="Password" />
      <div className="mt-5 px-5">
        <PasswordForm />
      </div>
      <SupplierBottomNav />
    </main>
  );
}

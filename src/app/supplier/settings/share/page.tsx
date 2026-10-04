import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { PushedHeader } from "@/app/_components/settings/menu";
import { ShareApp, appUrl } from "@/app/_components/share-app";
import { SupplierBottomNav } from "../../_components/bottom-nav";

export default async function ShareMolaroPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");
  const url = await appUrl();

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <PushedHeader
        native
        backText="Settings"
        backHref="/supplier/settings"
        backLabel="Back to settings"
        title="Share Molaro"
        intro="Classmates scan this to open Molaro and create their account."
      />
      <div className="mt-5 px-5">
        <ShareApp url={url} />
      </div>
      <SupplierBottomNav />
    </main>
  );
}

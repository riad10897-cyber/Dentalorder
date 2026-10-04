import { redirect } from "next/navigation";
import { getSupplierContext } from "@/lib/supplier/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "../../_components/bottom-nav";
import { MenuGroup, MenuInfo, PushedHeader } from "@/app/_components/settings/menu";
import { SELLER_STATUS_LABEL } from "../status";

/**
 * Shown, not editable: the owner sets these when making someone a seller,
 * and a seller renaming themselves would change what every student sees.
 */
export default async function SupplierMarketPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");
  const seller = await getSupplierContext(userId);
  if (!seller) redirect("/sign-in");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <PushedHeader
        native
        backText="Settings"
        backHref="/supplier/settings"
        backLabel="Back to settings"
        title="In the market"
        intro="What students see when they choose who to order from."
      />
      <div className="px-4">
        <MenuGroup native title="Your listing" footnote="Contact us (Settings → Help) to change any of these.">
          <MenuInfo native label="Name" value={seller.displayName} />
          <MenuInfo native label="Faculty" value={seller.university ?? "Every faculty"} />
          <MenuInfo native label="Status" value={SELLER_STATUS_LABEL[seller.status]} />
        </MenuGroup>
      </div>
      <SupplierBottomNav />
    </main>
  );
}

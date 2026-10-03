import { redirect } from "next/navigation";
import { getSupplierContext } from "@/lib/supplier/data";
import { getStudentContext } from "@/lib/student/data";
import { getVerifiedEmail, getVerifiedUserId } from "@/lib/supabase/auth";
import { SupplierBottomNav } from "../_components/bottom-nav";
import {
  APP_VERSION,
  AccountHeader,
  MenuGroup,
  MenuInfo,
  MenuLink,
  SignOutRow,
} from "@/app/_components/settings/menu";
import { SELLER_STATUS_LABEL } from "./status";

/**
 * Settings opens on a menu: whose account this is, then rows that each
 * open their own screen. Prices are not here — they live on Products,
 * beside the things they price.
 */
export default async function SupplierSettingsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const [seller, person, email] = await Promise.all([
    getSupplierContext(userId),
    getStudentContext(userId),
    getVerifiedEmail(),
  ]);
  if (!seller || !person) redirect("/sign-in");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <h1 className="px-5 pt-6 font-display text-display">Settings</h1>

      <AccountHeader
        name={person.fullName || seller.displayName}
        detail={`Seller · ${SELLER_STATUS_LABEL[seller.status]}`}
      />

      <MenuGroup title="Account">
        <MenuLink href="/supplier/settings/details" label="Personal details" detail={person.phone ?? "Add your phone"} />
        {email && <MenuInfo label="Email" value={email} />}
        <MenuLink href="/supplier/settings/password" label="Password" detail="Change" />
      </MenuGroup>

      <MenuGroup title="Selling">
        <MenuLink href="/supplier/settings/market" label="How you appear in the market" detail={seller.displayName} />
        <MenuLink href="/supplier/products" label="Prices and products" />
      </MenuGroup>

      <MenuGroup title="Help">
        <MenuInfo label="Questions about Dentora" value="Message Riad" />
        <MenuInfo label="Version" value={APP_VERSION} />
      </MenuGroup>

      <SignOutRow />

      <SupplierBottomNav />
    </main>
  );
}

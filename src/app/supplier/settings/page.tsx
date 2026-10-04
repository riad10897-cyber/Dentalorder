import { redirect } from "next/navigation";
import { ContactRow } from "@/app/_components/settings/contact-row";
import { BoxIcon, InfoIcon, LockIcon, MailIcon, PersonIcon, QrIcon, StoreIcon } from "@/app/_components/icons";
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
        <MenuLink href="/supplier/settings/details" label="Personal details" icon={<PersonIcon />} detail={person.phone ?? "Add your phone"} />
        {email && <MenuInfo label="Email" value={email} icon={<MailIcon />} />}
        <MenuLink href="/supplier/settings/password" label="Password" detail="Change" icon={<LockIcon />} />
      </MenuGroup>

      <MenuGroup title="Selling">
        <MenuLink href="/supplier/settings/market" label="How you appear in the market" icon={<StoreIcon />} detail={seller.displayName} />
        <MenuLink href="/supplier/products" label="Prices and products" icon={<BoxIcon />} />
      </MenuGroup>

      <MenuGroup title="Share" footnote="Show the code in class, or send the link to your group.">
        <MenuLink href="/supplier/settings/share" label="Share Molaro" detail="QR code" icon={<QrIcon />} />
      </MenuGroup>

      <MenuGroup title="Help">
        <ContactRow />
        <MenuInfo label="Version" value={APP_VERSION} icon={<InfoIcon />} />
      </MenuGroup>

      <SignOutRow />

      <SupplierBottomNav />
    </main>
  );
}

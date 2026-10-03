import { redirect } from "next/navigation";
import { getSupplierContext } from "@/lib/supplier/data";
import { getStudentContext } from "@/lib/student/data";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { SupplierBottomNav } from "../_components/bottom-nav";
import { ProfileForm } from "@/app/_components/profile-form";
import { signOut } from "@/app/actions/auth";

const STATUS_LABEL = {
  active: "Taking orders",
  pending_approval: "Waiting for approval",
  suspended: "Paused",
} as const;

/**
 * Settings is about the person and the account. Prices live on Products,
 * beside the things they price.
 *
 * The market name, faculty and status are shown but not editable: the
 * owner sets those when making someone a seller, and a seller renaming
 * themselves would change what every student sees in the market.
 */
export default async function SupplierSettingsPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");

  const supabase = await createClient();
  const [seller, person, { data: claims }] = await Promise.all([
    getSupplierContext(userId),
    getStudentContext(userId),
    supabase.auth.getClaims(),
  ]);
  if (!seller || !person) redirect("/sign-in");
  const email = typeof claims?.claims?.email === "string" ? claims.claims.email : null;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <h1 className="px-5 pt-6 font-display text-display">Settings</h1>

      <section className="mt-5 px-5" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="px-0.5 pb-1.5 text-micro uppercase text-ink-faint">
          Profile
        </h2>
        <ProfileForm
          fullName={person.fullName}
          phone={person.phone}
          university={person.university}
          yearOfStudy={person.yearOfStudy}
          phoneHint="Students use this to reach you about their order."
        />
      </section>

      <section className="mt-4 px-5" aria-labelledby="market-heading">
        <h2 id="market-heading" className="px-0.5 pb-1.5 text-micro uppercase text-ink-faint">
          In the market
        </h2>
        <dl className="overflow-hidden rounded-card border border-rule bg-card">
          <Row label="Name students see" value={seller.displayName} />
          <Row label="Faculty" value={seller.university ?? "Every faculty"} />
          <Row label="Status" value={STATUS_LABEL[seller.status]} />
        </dl>
        <p className="mt-1.5 px-0.5 text-caption text-ink-muted">Message Riad to change any of these.</p>
      </section>

      <section className="mt-7 px-5" aria-labelledby="account-heading">
        <h2 id="account-heading" className="px-0.5 pb-1.5 text-micro uppercase text-ink-faint">
          Account
        </h2>
        {email && (
          <dl className="overflow-hidden rounded-card border border-rule bg-card">
            <Row label="Email" value={email} />
          </dl>
        )}
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="pressable flex min-h-11 w-full items-center justify-center rounded-control border border-rule bg-card px-4 py-3 font-display text-body text-ink"
          >
            Sign out
          </button>
        </form>
      </section>

      <SupplierBottomNav />
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-hairline px-3 py-2.5 last:border-none">
      <dt className="shrink-0 text-small text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-body text-ink">{value}</dd>
    </div>
  );
}

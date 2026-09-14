import { redirect } from "next/navigation";
import { getRepContext } from "@/lib/rep/data";
import { RepBottomNav } from "../_components/bottom-nav";
import { PricingForm } from "./pricing-form";
import { signOut } from "@/app/actions/auth";

export default async function RepSettingsPage() {
  const rep = await getRepContext();
  if (!rep) redirect("/sign-in");

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-28">
      <div className="px-6 pt-5">
        <div className="text-[13px] text-ink-muted">{rep.displayName}</div>
        <div className="font-display text-xl font-bold">Settings</div>
      </div>

      <div className="px-6 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Pricing
      </div>
      <PricingForm frasacoPrice={rep.frasacoPrice} copyAPrice={rep.copyAPrice} />

      <div className="px-6 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-ink-muted">
        Account
      </div>
      <form action={signOut} className="mx-6">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-rule bg-card px-4 py-3.5 text-sm font-medium text-ink"
        >
          <span className="flex items-center gap-3">
            <span>🚪</span> Sign Out
          </span>
          <span className="text-ink-muted">›</span>
        </button>
      </form>

      <RepBottomNav />
    </main>
  );
}

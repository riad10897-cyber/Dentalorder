import { redirect } from "next/navigation";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getAdminOverview } from "@/lib/admin/data";
import { SignOutRow } from "@/app/_components/settings/menu";
import { AdminView } from "./admin-view";

// Always fresh: this is the screen the owner opens to see what is
// happening right now.
export const dynamic = "force-dynamic";

/**
 * The owner's overview: who is ordering, from whom, and what is stuck.
 * Read only — nothing here changes an order or an account. The middleware
 * lets only admins reach /admin, and the page checks again; the data is
 * read through RLS, which shows everything only to an admin.
 */
export default async function AdminPage() {
  const userId = await getVerifiedUserId();
  if (!userId) redirect("/sign-in");
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (me?.role !== "admin") redirect("/");

  const data = await getAdminOverview();

  return (
    <>
      <AdminView data={data} />
      <div className="mx-auto -mt-8 max-w-md px-4 pb-12">
        <SignOutRow native />
      </div>
    </>
  );
}

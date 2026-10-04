import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { signOut } from "@/app/actions/auth";
import type { UserRole } from "@/lib/supabase/types";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Student",
  rep: "Student supplier",
  supplier: "Supplier",
  admin: "Admin",
};

export async function RoleHome({ role }: { role: UserRole }) {
  const userId = await getVerifiedUserId();
  const supabase = await createClient();

  const { data: profile } = userId
    ? await supabase.from("profiles").select("full_name, role").eq("id", userId).single()
    : { data: null };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 py-10 text-center">
      <span className="rounded-control border border-rule bg-card px-3 py-1 text-micro uppercase text-ink">
        {ROLE_LABEL[role]}
      </span>
      <h1 className="font-display text-title text-ink">
        {profile?.full_name ?? "Welcome"}
      </h1>
      <p className="text-small text-ink-muted">
        This is the {ROLE_LABEL[role].toLowerCase()} home. Phase 1 stops here.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="pressable min-h-11 rounded-control border border-rule bg-card px-4 py-2 font-display text-small text-ink"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}

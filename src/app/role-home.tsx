import { createClient } from "@/lib/supabase/server";
import { getVerifiedUserId } from "@/lib/supabase/auth";
import { signOut } from "@/app/actions/auth";
import type { UserRole } from "@/lib/supabase/types";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Student",
  rep: "Representative",
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <span className="rounded-full border border-rule bg-card px-3 py-1 text-xs uppercase tracking-wide text-ink">
        {ROLE_LABEL[role]}
      </span>
      <h1 className="text-2xl font-semibold text-ink">
        {profile?.full_name ?? "Welcome"}
      </h1>
      <p className="text-sm text-ink-muted">
        This is the {ROLE_LABEL[role].toLowerCase()} home. Phase 1 stops here.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="min-h-11 rounded-sm border border-rule px-4 py-2 text-sm text-ink-muted"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}

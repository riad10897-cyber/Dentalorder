import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

const ROLE_HOME: Record<UserRole, string> = {
  student: "/student",
  rep: "/rep",
  supplier: "/supplier",
  admin: "/admin",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    redirect(profile ? ROLE_HOME[profile.role] : "/sign-in");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <h1 className="font-heading text-3xl font-bold text-text">DentalOrder</h1>
      <p className="text-sm text-text-muted">
        Weekly tooth ordering and dental supplies for students in Lebanon.
      </p>
      <div className="flex w-full flex-col gap-3">
        <a
          href="/sign-up"
          className="min-h-11 rounded-sm bg-accent px-4 py-3 text-center font-semibold text-bg"
        >
          Create an account
        </a>
        <a
          href="/sign-in"
          className="min-h-11 rounded-sm border border-border px-4 py-3 text-center text-text"
        >
          Sign in
        </a>
      </div>
    </main>
  );
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "./types";

const ROLE_HOME: Record<UserRole, string> = {
  student: "/student",
  rep: "/rep",
  supplier: "/supplier",
  admin: "/admin",
};

const PROTECTED_PREFIXES = ["/student", "/rep", "/supplier", "/admin"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims verifies the JWT signature locally (this project signs with
  // ES256) instead of calling /auth/v1/user, which was a network round
  // trip on every single request. It still refreshes an expiring session,
  // and it still rejects a forged or expired token — unlike getSession,
  // which trusts the cookie and must never be used here.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
  );

  if (isProtected && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (isProtected && userId) {
    // Role still comes from the profiles table, not from the JWT's
    // user_metadata: metadata is writable by the user themselves, so
    // routing on it would let anyone put themselves in another role's
    // section. RLS would still hold, but the redirect would be wrong.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    const role = profile?.role;
    const home = role ? ROLE_HOME[role] : "/sign-in";

    if (!role || !path.startsWith(home)) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

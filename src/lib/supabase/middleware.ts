import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const PROTECTED_PREFIXES = ["/student", "/supplier", "/admin"];

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
    // Supplying is a row in suppliers, not a role — that is what lets one
    // account be both a student and a supplier. So routing asks two
    // questions rather than one, in parallel.
    const [{ data: profile }, { data: supplier }] = await Promise.all([
      // Role still comes from the profiles table, not from the JWT's
      // user_metadata: metadata is writable by the user themselves, so
      // routing on it would let anyone put themselves in another role's
      // section. RLS would still hold, but the redirect would be wrong.
      supabase.from("profiles").select("role").eq("id", userId).single(),
      supabase.from("suppliers").select("id").eq("id", userId).maybeSingle(),
    ]);

    const role = profile?.role;
    if (!role) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }

    const supplies = Boolean(supplier);
    const allowed =
      path.startsWith("/admin") ? role === "admin"
      : path.startsWith("/supplier") ? supplies
      : path.startsWith("/student") ? true
      : false;

    if (!allowed) {
      const url = request.nextUrl.clone();
      // A pending supplier still lands on the supplier screens — the
      // dashboard tells them they are pending. Sending them to /student
      // instead would hide the one screen that explains the wait.
      url.pathname = role === "admin" ? "/admin" : supplies ? "/supplier" : "/student";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

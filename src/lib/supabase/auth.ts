import "server-only";
import { cache } from "react";
import { createClient } from "./server";

/**
 * The signed-in user's id, or null.
 *
 * Uses `getClaims()` rather than `getUser()`. This project signs JWTs with
 * an asymmetric key (ES256), so `getClaims()` verifies the signature
 * locally with WebCrypto against a cached JWKS instead of calling
 * `/auth/v1/user` — which was a full network round trip to Frankfurt on
 * every request, twice per page.
 *
 * This is not the same shortcut as `getSession()`. That one decodes the
 * cookie without checking anything and must never be trusted on the
 * server; this verifies the signature cryptographically and rejects an
 * expired or forged token. Authorisation still rests on RLS regardless.
 *
 * Wrapped in React's `cache` so several components in one render share a
 * single verification.
 */
export const getVerifiedUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
});

/** The signed-in user's email, from the same verified token. */
export const getVerifiedEmail = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  if (error || typeof email !== "string") return null;
  return email;
});

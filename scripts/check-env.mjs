// Fails the build with a clear message if NEXT_PUBLIC_SUPABASE_URL is
// malformed. This exact mistake (pasting the URL with a trailing
// /rest/v1 or a slash) has taken the whole site down twice — every
// Supabase call breaks, not just one page.
const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!raw) {
  fail("NEXT_PUBLIC_SUPABASE_URL is not set.");
}

let url;
try {
  url = new URL(raw);
} catch {
  fail(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${raw}"`);
}

if (url.protocol !== "https:") {
  fail(`NEXT_PUBLIC_SUPABASE_URL must use https:// — got "${raw}"`);
}

if (!url.hostname.endsWith(".supabase.co")) {
  fail(
    `NEXT_PUBLIC_SUPABASE_URL must be a *.supabase.co project URL — got "${raw}"`,
  );
}

if (url.pathname !== "/" && url.pathname !== "") {
  fail(
    `NEXT_PUBLIC_SUPABASE_URL must have no path after the domain (no /rest/v1, no /auth/v1, nothing) — got "${raw}". ` +
      `It should look like: https://${url.hostname}`,
  );
}

if (url.search || url.hash) {
  fail(
    `NEXT_PUBLIC_SUPABASE_URL must have no query string or fragment — got "${raw}"`,
  );
}

function fail(message) {
  console.error(`\n❌ Invalid NEXT_PUBLIC_SUPABASE_URL\n\n${message}\n`);
  console.error(
    "Copy the URL from Supabase → Project Settings → API → Project URL, exactly as shown, with nothing appended.\n",
  );
  process.exit(1);
}

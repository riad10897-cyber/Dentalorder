// Concatenates supabase/migrations/*.sql, in filename order, into
// supabase/schema-full.sql — the single paste that stands up a fresh
// Supabase project.
//
//   npm run schema:build
//
// Run it whenever a migration is added, or the combined file silently
// falls behind and a new project comes up missing the newest changes.
import fs from "node:fs";
import path from "node:path";

const DIR = path.join("supabase", "migrations");
const OUT = path.join("supabase", "schema-full.sql");

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) {
  console.error(`No migrations found in ${DIR}`);
  process.exit(1);
}

let out = `-- ═══════════════════════════════════════════════════════════════════
-- DentalOrder — complete schema, for a FRESH Supabase project
-- ═══════════════════════════════════════════════════════════════════
--
-- Every migration in supabase/migrations/, in filename order, in one
-- file. Paste the whole thing into the Supabase SQL Editor and press Run
-- once.
--
-- THIS IS FOR AN EMPTY PROJECT ONLY. It runs \`create type\` and
-- \`create table\` without guards, so against a project that already has
-- the schema it stops on the first object that exists and leaves the
-- rest unapplied. Use it to stand up a new project (the test project in
-- OPERATIONS.md, or a rebuild); use the individual migration files for a
-- project that already has data.
--
-- Generated file — do not edit. Change a migration and re-run
-- \`npm run schema:build\`.
--
-- Generated from:
`;
for (const f of files) out += `--   ${f}\n`;
out += "\n";

for (const f of files) {
  const body = fs.readFileSync(path.join(DIR, f), "utf8").replace(/\s+$/, "");
  out += `
-- ═══════════════════════════════════════════════════════════════════
-- BEGIN ${f}
-- ═══════════════════════════════════════════════════════════════════

${body}

-- END ${f}
`;
}

fs.writeFileSync(OUT, out);
console.log(`${OUT} <- ${files.length} migrations`);
for (const f of files) console.log(`  ${f}`);

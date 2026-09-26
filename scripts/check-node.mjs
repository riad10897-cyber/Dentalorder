// Fails if the Node running this is not the Node the project targets.
//
// This exists because of a real bug. `npm test` was written as
// `tsx --test src/**/*.test.ts`, which only works on Node 22 and up. The
// container this was developed in ran 22, CI ran 20, and the mismatch was
// silent: every local run reported 14 passing tests while CI had never
// executed a single one. Five commits shipped on the strength of a green
// result that was only green on one machine.
//
// .nvmrc is the single source of truth. GitHub Actions reads it through
// node-version-file; Vercel's runtime is set in its Project Settings and is
// kept to the same major by hand (Vercel does not read .nvmrc). Keeping the
// three aligned is a standing task, so this makes drift loud rather than
// leaving it to be discovered by a workflow failing for the wrong reason.
import fs from "node:fs";
import path from "node:path";

const wanted = fs.readFileSync(path.join(process.cwd(), ".nvmrc"), "utf8").trim();
const wantedMajor = Number(wanted.replace(/^v/, "").split(".")[0]);
const actualMajor = Number(process.versions.node.split(".")[0]);

if (!Number.isFinite(wantedMajor)) {
  console.error(`\n.nvmrc does not contain a version this can read: ${JSON.stringify(wanted)}\n`);
  process.exit(1);
}

if (actualMajor !== wantedMajor) {
  console.error(
    `\nWrong Node version.\n\n` +
      `  .nvmrc asks for:  ${wantedMajor}.x\n` +
      `  you are running:  ${process.versions.node}\n\n` +
      `Results from the wrong major cannot be trusted — this check exists\n` +
      `because a test suite once passed locally and ran zero tests in CI.\n\n` +
      `Switch with:  nvm use\n`,
  );
  process.exit(1);
}

// Finds the test files in Node and hands tsx explicit paths.
//
// The script used to be `tsx --test src/**/*.test.ts`, which relied on the
// test runner expanding the glob. Node only learned to do that in 22.
// .nvmrc pins 20, so CI passed the pattern through as a literal path,
// found nothing, and failed — while the same command passed locally on
// 22. Resolving the paths here works the same on every version.
//
// Finding no tests is an error. A test suite that silently runs nothing
// is worse than one that fails.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = "src";

// A pass on the wrong major proves nothing — see scripts/check-node.mjs.
const versionCheck = spawnSync(process.execPath, ["scripts/check-node.mjs"], { stdio: "inherit" });
if (versionCheck.status !== 0) process.exit(versionCheck.status ?? 1);

function findTests(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findTests(full));
    else if (entry.name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

const tests = findTests(ROOT).sort();
if (tests.length === 0) {
  console.error(`No *.test.ts files found under ${ROOT}/.`);
  process.exit(1);
}

console.log(`Running ${tests.length} test file(s):`);
for (const t of tests) console.log(`  ${t}`);
console.log();

const child = spawn("tsx", ["--test", ...tests], { stdio: "inherit", shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 1));

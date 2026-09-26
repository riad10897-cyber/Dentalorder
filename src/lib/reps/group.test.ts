import { test } from "node:test";
import assert from "node:assert/strict";
import { groupRepsByUniversity } from "./group";

const rep = (id: string, university: string | null) => ({
  id,
  displayName: id,
  university,
  section: null,
  frasacoPrice: 2.5,
  copyAPrice: 1.2,
});

const BAU_A = rep("bau-a", "BAU");
const BAU_B = rep("bau-b", "BAU");
const LU_A = rep("lu-a", "LU");

test("splits into the student's own faculty and everyone else", () => {
  const { mine, others, grouped } = groupRepsByUniversity([BAU_A, LU_A, BAU_B], "BAU");
  assert.equal(grouped, true);
  assert.deepEqual(mine.map((r) => r.id), ["bau-a", "bau-b"]);
  assert.deepEqual(others.map((r) => r.id), ["lu-a"]);
});

test("never drops a rep: every input comes back in one bucket or the other", () => {
  for (const university of ["BAU", "LU", "USJ", "Somewhere else", "", null]) {
    const input = [BAU_A, LU_A, BAU_B, rep("no-uni", null)];
    const { mine, others } = groupRepsByUniversity(input, university);
    assert.equal(
      mine.length + others.length,
      input.length,
      `a rep went missing for university ${JSON.stringify(university)}`,
    );
  }
});

test("a faculty with no rep leaves an empty own-bucket, not an empty list", () => {
  const { mine, others, grouped } = groupRepsByUniversity([BAU_A, BAU_B], "USJ");
  assert.equal(grouped, true);
  assert.deepEqual(mine, []);
  assert.equal(others.length, 2, "the other faculties' reps must stay reachable");
});

test("no faculty chosen yet is one flat list, not a group claimed as theirs", () => {
  for (const notChosen of ["", "   ", null, undefined]) {
    const { mine, others, grouped } = groupRepsByUniversity([BAU_A, LU_A], notChosen);
    assert.equal(grouped, false);
    assert.deepEqual(mine, []);
    assert.equal(others.length, 2);
  }
});

test("matching ignores case and stray whitespace", () => {
  // Existing rows held both "BAU" and "Bau" before the data was normalised;
  // a student picking BAU must still see a rep stored either way.
  const messy = [rep("a", "bau"), rep("b", " BAU "), rep("c", "Bau")];
  const { mine, others } = groupRepsByUniversity(messy, "BAU");
  assert.equal(mine.length, 3);
  assert.deepEqual(others, []);
});

test("a rep with no university recorded is an 'other', never silently yours", () => {
  const { mine, others } = groupRepsByUniversity([rep("unknown", null)], "BAU");
  assert.deepEqual(mine, []);
  assert.deepEqual(others.map((r) => r.id), ["unknown"]);
});

test("input order is preserved inside each bucket, so rows never swap places", () => {
  const alphabetical = [rep("a", "BAU"), rep("b", "LU"), rep("c", "BAU"), rep("d", "LU")];
  const { mine, others } = groupRepsByUniversity(alphabetical, "BAU");
  assert.deepEqual(mine.map((r) => r.id), ["a", "c"]);
  assert.deepEqual(others.map((r) => r.id), ["b", "d"]);
});

// Lebanese dental faculties, for the sign-up picker.
//
// This list is not authoritative — it holds the schools we are certain
// of, and "Other" exists so a student from one we have missed can still
// sign up rather than being locked out by an incomplete dropdown.
// Replace it wholesale once LADS supplies the definitive list; the column
// is free text, so adding names here needs no migration and does not
// disturb accounts already created.
export const UNIVERSITIES = [
  { value: "LU", label: "Lebanese University (LU)" },
  { value: "USJ", label: "Saint Joseph University (USJ)" },
  { value: "BAU", label: "Beirut Arab University (BAU)" },
] as const;

// Sentinel for the picker only. It is never stored: choosing it swaps in
// a free-text field, and whatever is typed there is what gets saved.
export const OTHER_UNIVERSITY = "__other__";

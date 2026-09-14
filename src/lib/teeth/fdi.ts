// FDI two-digit tooth numbering. Four quadrants of eight, from the
// patient's perspective: Q1 upper right, Q2 upper left, Q3 lower left,
// Q4 lower right.

export const TOOTH_NAMES: Record<number, string> = {
  11: "Upper Right Central Incisor",
  12: "Upper Right Lateral Incisor",
  13: "Upper Right Canine",
  14: "Upper Right 1st Premolar",
  15: "Upper Right 2nd Premolar",
  16: "Upper Right 1st Molar",
  17: "Upper Right 2nd Molar",
  18: "Upper Right 3rd Molar",
  21: "Upper Left Central Incisor",
  22: "Upper Left Lateral Incisor",
  23: "Upper Left Canine",
  24: "Upper Left 1st Premolar",
  25: "Upper Left 2nd Premolar",
  26: "Upper Left 1st Molar",
  27: "Upper Left 2nd Molar",
  28: "Upper Left 3rd Molar",
  31: "Lower Left Central Incisor",
  32: "Lower Left Lateral Incisor",
  33: "Lower Left Canine",
  34: "Lower Left 1st Premolar",
  35: "Lower Left 2nd Premolar",
  36: "Lower Left 1st Molar",
  37: "Lower Left 2nd Molar",
  38: "Lower Left 3rd Molar",
  41: "Lower Right Central Incisor",
  42: "Lower Right Lateral Incisor",
  43: "Lower Right Canine",
  44: "Lower Right 1st Premolar",
  45: "Lower Right 2nd Premolar",
  46: "Lower Right 1st Molar",
  47: "Lower Right 2nd Molar",
  48: "Lower Right 3rd Molar",
};

export const QUADRANT_TEETH: Record<1 | 2 | 3 | 4, number[]> = {
  1: [11, 12, 13, 14, 15, 16, 17, 18],
  2: [21, 22, 23, 24, 25, 26, 27, 28],
  3: [31, 32, 33, 34, 35, 36, 37, 38],
  4: [41, 42, 43, 44, 45, 46, 47, 48],
};

// How the chart is laid out on screen: four rows of eight, molars at the
// outside, central incisors meeting at the midline (11 next to 21, 41 next
// to 31) exactly as on a real dental chart. Upper arch first.
export const CHART_ROWS: { arch: "upper" | "lower"; teeth: number[] }[] = [
  { arch: "upper", teeth: [18, 17, 16, 15, 25, 26, 27, 28] },
  { arch: "upper", teeth: [14, 13, 12, 11, 21, 22, 23, 24] },
  { arch: "lower", teeth: [44, 43, 42, 41, 31, 32, 33, 34] },
  { arch: "lower", teeth: [48, 47, 46, 45, 35, 36, 37, 38] },
];

export const ALL_TOOTH_NUMBERS = [
  ...QUADRANT_TEETH[1],
  ...QUADRANT_TEETH[2],
  ...QUADRANT_TEETH[3],
  ...QUADRANT_TEETH[4],
];

export function isValidToothNumber(n: number): boolean {
  return (
    (n >= 11 && n <= 18) ||
    (n >= 21 && n <= 28) ||
    (n >= 31 && n <= 38) ||
    (n >= 41 && n <= 48)
  );
}

// The fixed list, in the order a seller and a student see it. The database
// holds exactly these five (20260116000000) and only an admin can change
// that table, so this list and the table cannot drift apart unnoticed:
// a slug missing from the table makes the product form fail loudly.
export const PRODUCT_CATEGORIES = [
  { slug: "burs", name: "Burs" },
  { slug: "instruments", name: "Instruments" },
  { slug: "materials", name: "Materials" },
  { slug: "gloves-masks", name: "Gloves & masks" },
  { slug: "equipment", name: "Equipment" },
] as const;

export type ProductCategorySlug = (typeof PRODUCT_CATEGORIES)[number]["slug"];

export const CATEGORY_SLUGS = PRODUCT_CATEGORIES.map((c) => c.slug) as [
  ProductCategorySlug,
  ...ProductCategorySlug[],
];

export function categoryName(slug: string): string {
  return PRODUCT_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
}

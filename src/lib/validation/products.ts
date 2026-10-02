import { z } from "zod";
import { CATEGORY_SLUGS } from "@/lib/products/categories";

// Mirrors the database's own checks (products_price_range, _name_present,
// _unit_length) so a seller is told what is wrong before a round trip.
// The database checks again either way.
export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(80, "Keep the name under 80 characters."),
  category: z.enum(CATEGORY_SLUGS, { message: "Choose a category." }),
  price: z.coerce
    .number({ message: "Enter a price." })
    .gt(0, "The price must be more than $0.")
    .max(2000, "The price must be $2,000 or less.")
    // Money is numeric(10,2). A third decimal would be silently rounded by
    // the database, and the seller would see a different price than typed.
    .refine((n) => Math.round(n * 100) === n * 100, "Use at most two decimals, like 6.50."),
  unit: z
    .string()
    .trim()
    .max(40, "Keep the unit under 40 characters.")
    .optional()
    .transform((v) => (v ? v : null)),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const productIdSchema = z.string().uuid();

import { z } from "zod";
import { isValidToothNumber } from "@/lib/teeth/fdi";

const toothItemSchema = z.object({
  toothNumber: z.number().int().refine(isValidToothNumber, "Invalid FDI tooth number."),
  toothType: z.enum(["frasaco", "copy_a"]),
  quantity: z.number().int().min(1).max(10),
});

// An extra is an id and a quantity — nothing else is accepted, so there is
// no field a crafted request could put a price in. .strict() refuses one
// that tries.
const extraItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10),
  })
  .strict();

// Teeth, extras, or both — but at least one line, and within what the
// database accepts (64 tooth lines + extras, 100 in all).
const linesSchema = {
  items: z.array(toothItemSchema).max(64),
  extras: z.array(extraItemSchema).max(36).default([]),
};
const atLeastOneLine = (v: { items: unknown[]; extras: unknown[] }) => v.items.length + v.extras.length > 0;

export const submitToothOrderSchema = z.object({
  supplierId: z.string().uuid("Choose a supplier."),
  weekNumber: z.number().int().min(1).max(17),
  ...linesSchema,
  // What the screen showed. The database refuses the order if the real
  // total differs, so the student is never charged a figure they did not see.
  expectedTotal: z.number().nonnegative().max(100000),
}).refine(atLeastOneLine, "Add at least one tooth or extra.");
export type SubmitToothOrderInput = z.infer<typeof submitToothOrderSchema>;

// Editing names the order, not a supplier or a week: both are read from
// the order being replaced, inside the database, and never taken from
// the request. expectedTotal is what the student was shown on the review
// screen — the database refuses the edit if the real total differs.
export const editToothOrderSchema = z.object({
  orderId: z.string().uuid(),
  ...linesSchema,
  expectedTotal: z.number().nonnegative().max(100000),
}).refine(atLeastOneLine, "Add at least one tooth or extra.");

export const fulfillmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "fulfilled",
  "cancelled",
  "rejected",
]);

// A rejection the student cannot act on is worse than none: "no" with no
// reason just moves the question to WhatsApp. Short enough to type on a
// phone between classes, long enough to be a sentence.
export const rejectOrderSchema = z.object({
  orderId: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(3, "Say why, even briefly — the student sees this.")
    .max(200, "Keep it under 200 characters."),
});

// The seller names the lines to take off, by id, and nothing else: the
// database reprices nothing and reads no amount from the request.
export const removeUnavailableSchema = z.object({
  orderId: z.string().uuid(),
  lineIds: z.array(z.string().uuid()).min(1, "Choose what isn't available.").max(100),
});

export const paymentStatusSchema = z.enum(["unpaid", "pending", "paid"]);

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  fulfillmentStatus: fulfillmentStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
});

export const currentWeekSchema = z.number().int().min(1, "Weeks start at 1.").max(17, "The semester has 17 weeks.");

export const updateRepPricesSchema = z.object({
  frasacoPrice: z.coerce.number().positive().max(1000),
  copyAPrice: z.coerce.number().positive().max(1000),
});

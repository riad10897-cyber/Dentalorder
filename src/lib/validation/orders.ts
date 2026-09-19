import { z } from "zod";
import { isValidToothNumber } from "@/lib/teeth/fdi";

const toothItemSchema = z.object({
  toothNumber: z.number().int().refine(isValidToothNumber, "Invalid FDI tooth number."),
  toothType: z.enum(["frasaco", "copy_a"]),
  quantity: z.number().int().min(1).max(10),
});

export const submitToothOrderSchema = z.object({
  weekNumber: z.number().int().min(1).max(17),
  // 64 is every line the chart can produce: 32 FDI positions in two types.
  // The database enforces the same ceiling — this just fails faster.
  items: z.array(toothItemSchema).min(1, "Add at least one tooth.").max(64),
});
export type SubmitToothOrderInput = z.infer<typeof submitToothOrderSchema>;

export const fulfillmentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "fulfilled",
  "cancelled",
]);

export const paymentStatusSchema = z.enum(["unpaid", "pending", "paid"]);

export const updateOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  fulfillmentStatus: fulfillmentStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
});

export const updateRepPricesSchema = z.object({
  frasacoPrice: z.coerce.number().positive().max(1000),
  copyAPrice: z.coerce.number().positive().max(1000),
});

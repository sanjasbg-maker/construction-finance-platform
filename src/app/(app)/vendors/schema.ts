import { z } from "zod";

export const currencies = ["EUR", "RSD"] as const;

export const vendorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  taxId: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  paymentTerms: z.string().trim().max(200).optional().or(z.literal("")),
  openingBalance: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Number(v)), "Opening balance must be a number"),
  openingBalanceCurrency: z.enum(currencies),
});

export type VendorInput = z.infer<typeof vendorSchema>;

/** Converts empty-string optionals (from a submitted form) to null for storage. */
export function toVendorData(input: VendorInput) {
  return {
    name: input.name,
    taxId: input.taxId || null,
    email: input.email || null,
    phone: input.phone || null,
    paymentTerms: input.paymentTerms || null,
    openingBalance: input.openingBalance || "0",
    openingBalanceCurrency: input.openingBalanceCurrency,
  };
}

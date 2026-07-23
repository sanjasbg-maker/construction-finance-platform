import { z } from "zod";

export const currencies = ["EUR", "RSD"] as const;

export const bankAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  iban: z.string().trim().max(50).optional().or(z.literal("")),
  currency: z.enum(currencies),
  openingBalance: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(Number(v)), "Opening balance must be a number"),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;

/** Converts empty-string optionals (from a submitted form) to null for storage. */
export function toBankAccountData(input: BankAccountInput) {
  return {
    name: input.name,
    iban: input.iban || null,
    currency: input.currency,
    openingBalance: input.openingBalance || "0",
  };
}

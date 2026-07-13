import { z } from "zod";

export const directions = ["COMPANY_FROM_VENDOR", "CLIENT_FROM_COMPANY"] as const;
export const statuses = ["HELD", "PARTIALLY_RELEASED", "RELEASED"] as const;
export const currencies = ["EUR", "RSD"] as const;

function decimalString(label: string, { min, max }: { min?: number; max?: number } = {}) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => !Number.isNaN(Number(v)), `${label} must be a number`)
    .refine((v) => min === undefined || Number(v) >= min, `${label} must be at least ${min}`)
    .refine((v) => max === undefined || Number(v) <= max, `${label} must be at most ${max}`);
}

export const retentionSchema = z.object({
  contractId: z.string().trim().min(1, "Contract is required"),
  direction: z.enum(directions),
  // Which of purchaseInvoiceId/salesInvoiceId this maps to depends on
  // direction - see toRetentionData. The form only ever shows one invoice
  // picker at a time (filtered to the selected contract), so there's no
  // combination where both would be meaningful.
  linkedInvoiceId: z.string().trim().optional(),
  amount: decimalString("Amount", { min: 0 }),
  currency: z.enum(currencies),
  percent: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100),
      "Percent must be between 0 and 100",
    ),
  status: z.enum(statuses),
  releaseDate: z.string().trim().optional().or(z.literal("")),
});

export type RetentionInput = z.infer<typeof retentionSchema>;

export function toRetentionData(input: RetentionInput) {
  return {
    contractId: input.contractId,
    direction: input.direction,
    purchaseInvoiceId:
      input.direction === "COMPANY_FROM_VENDOR" ? input.linkedInvoiceId || null : null,
    salesInvoiceId: input.direction === "CLIENT_FROM_COMPANY" ? input.linkedInvoiceId || null : null,
    amount: input.amount,
    currency: input.currency,
    percent: input.percent || null,
    status: input.status,
    releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
  };
}

import { z } from "zod";

export const contractStatuses = ["DRAFT", "ACTIVE", "COMPLETED", "TERMINATED"] as const;
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

export const contractSchema = z.object({
  number: z.string().trim().min(1, "Number is required").max(100),
  date: z.string().trim().min(1, "Date is required"),
  projectId: z.string().trim().min(1, "Project is required"),
  value: decimalString("Value", { min: 0 }),
  currency: z.enum(currencies),
  retentionPercent: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100),
      "Retention must be between 0 and 100",
    ),
  status: z.enum(contractStatuses),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
});

export type ContractInput = z.infer<typeof contractSchema>;

function toDate(value: string) {
  return value ? new Date(value) : null;
}

export function toContractData(input: ContractInput) {
  return {
    number: input.number,
    date: new Date(input.date),
    projectId: input.projectId,
    value: input.value,
    currency: input.currency,
    retentionPercent: input.retentionPercent || null,
    status: input.status,
    startDate: toDate(input.startDate ?? ""),
    endDate: toDate(input.endDate ?? ""),
  };
}

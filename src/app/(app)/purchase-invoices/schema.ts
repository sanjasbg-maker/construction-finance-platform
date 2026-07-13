import { z } from "zod";

export const currencies = ["EUR", "RSD"] as const;

export const purchaseInvoiceSchema = z.object({
  number: z.string().trim().min(1, "Number is required").max(100),
  sefNumber: z.string().trim().max(100).optional().or(z.literal("")),
  vendorId: z.string().trim().min(1, "Vendor is required"),
  projectId: z.string().trim().min(1, "Project is required"),
  contractId: z.string().trim().optional().or(z.literal("")),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((v) => !Number.isNaN(Number(v)), "Amount must be a number")
    .refine((v) => Number(v) >= 0, "Amount must be at least 0"),
  currency: z.enum(currencies),
  issueDate: z.string().trim().min(1, "Issue date is required"),
  dueDate: z.string().trim().min(1, "Due date is required"),
});

export type PurchaseInvoiceInput = z.infer<typeof purchaseInvoiceSchema>;

export function toPurchaseInvoiceData(input: PurchaseInvoiceInput) {
  return {
    number: input.number,
    sefNumber: input.sefNumber || null,
    vendorId: input.vendorId,
    projectId: input.projectId,
    contractId: input.contractId || null,
    amount: input.amount,
    currency: input.currency,
    issueDate: new Date(input.issueDate),
    dueDate: new Date(input.dueDate),
  };
}

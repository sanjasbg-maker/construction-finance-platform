import { z } from "zod";

export const currencies = ["EUR", "RSD"] as const;
export const salesInvoiceStatuses = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;

export const salesInvoiceSchema = z.object({
  number: z.string().trim().min(1, "Number is required").max(100),
  clientId: z.string().trim().min(1, "Client is required"),
  projectId: z.string().trim().min(1, "Project is required"),
  contractId: z.string().trim().optional().or(z.literal("")),
  situationId: z.string().trim().optional().or(z.literal("")),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((v) => !Number.isNaN(Number(v)), "Amount must be a number")
    .refine((v) => Number(v) >= 0, "Amount must be at least 0"),
  currency: z.enum(currencies),
  issueDate: z.string().trim().min(1, "Issue date is required"),
  dueDate: z.string().trim().min(1, "Due date is required"),
  status: z.enum(salesInvoiceStatuses),
});

export type SalesInvoiceInput = z.infer<typeof salesInvoiceSchema>;

export function toSalesInvoiceData(input: SalesInvoiceInput) {
  return {
    number: input.number,
    clientId: input.clientId,
    projectId: input.projectId,
    contractId: input.contractId || null,
    situationId: input.situationId || null,
    amount: input.amount,
    currency: input.currency,
    issueDate: new Date(input.issueDate),
    dueDate: new Date(input.dueDate),
    status: input.status,
  };
}

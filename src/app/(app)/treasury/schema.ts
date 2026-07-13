import { z } from "zod";

export const currencies = ["EUR", "RSD"] as const;

export const paymentPurposes = [
  "VENDOR_ADVANCE",
  "CLIENT_ADVANCE",
  "PURCHASE_SETTLEMENT",
  "SALES_SETTLEMENT",
] as const;

export type PaymentPurpose = (typeof paymentPurposes)[number];

export const purposeLabels: Record<PaymentPurpose, string> = {
  VENDOR_ADVANCE: "Advance to Vendor",
  CLIENT_ADVANCE: "Advance from Client",
  PURCHASE_SETTLEMENT: "Vendor Invoice Settlement",
  SALES_SETTLEMENT: "Client Invoice Settlement",
};

const basePaymentFields = {
  bankAccountId: z.string().trim().min(1, "Bank account is required"),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((v) => !Number.isNaN(Number(v)), "Amount must be a number")
    .refine((v) => Number(v) > 0, "Amount must be greater than 0"),
  currency: z.enum(currencies),
  date: z.string().trim().min(1, "Date is required"),
};

export const paymentSchema = z
  .object({
    purpose: z.enum(paymentPurposes),
    vendorId: z.string().trim().optional().or(z.literal("")),
    clientId: z.string().trim().optional().or(z.literal("")),
    ...basePaymentFields,
  })
  .refine((data) => data.purpose !== "VENDOR_ADVANCE" || data.vendorId, {
    message: "Vendor is required for a vendor advance",
    path: ["vendorId"],
  })
  .refine((data) => data.purpose !== "CLIENT_ADVANCE" || data.clientId, {
    message: "Client is required for a client advance",
    path: ["clientId"],
  });

export type PaymentInput = z.infer<typeof paymentSchema>;

export function toPaymentData(input: PaymentInput) {
  const isAdvance = input.purpose === "VENDOR_ADVANCE" || input.purpose === "CLIENT_ADVANCE";
  const direction =
    input.purpose === "VENDOR_ADVANCE" || input.purpose === "PURCHASE_SETTLEMENT" ? "OUT" : "IN";
  const type =
    input.purpose === "VENDOR_ADVANCE" || input.purpose === "CLIENT_ADVANCE"
      ? input.purpose
      : "INVOICE_SETTLEMENT";

  return {
    direction: direction as "OUT" | "IN",
    type: type as "VENDOR_ADVANCE" | "CLIENT_ADVANCE" | "INVOICE_SETTLEMENT",
    bankAccountId: input.bankAccountId,
    vendorId: input.purpose === "VENDOR_ADVANCE" ? input.vendorId || null : null,
    clientId: input.purpose === "CLIENT_ADVANCE" ? input.clientId || null : null,
    amount: input.amount,
    originalAmount: isAdvance ? input.amount : null,
    currency: input.currency,
    date: new Date(input.date),
  };
}

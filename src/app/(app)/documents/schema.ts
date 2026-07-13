import { z } from "zod";

export const CATEGORIES = [
  "CONTRACT",
  "AMENDMENT",
  "INVOICE",
  "BANK_STATEMENT",
  "GUARANTEE",
  "PHOTO",
  "CORRESPONDENCE",
  "OTHER",
] as const;

// Guarantee and Contract Amendment aren't manageable in the UI yet (no CRUD
// module exists for either), so they're left off the link picker - documents
// can still be tagged with those *categories*, just not linked to a specific
// record of that type.
export const LINK_TYPES = [
  "NONE",
  "PROJECT",
  "CONTRACT",
  "PURCHASE_INVOICE",
  "SALES_INVOICE",
  "BANK_STATEMENT",
] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const documentMetaSchema = z
  .object({
    category: z.enum(CATEGORIES),
    linkType: z.enum(LINK_TYPES),
    linkId: z.string().optional(),
  })
  .refine((data) => data.linkType === "NONE" || !!data.linkId, {
    message: 'Select a record to link to, or choose "Not linked".',
    path: ["linkId"],
  });

export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;

export function toLinkFields(data: { linkType: LinkType; linkId?: string }) {
  const base = {
    projectId: null as string | null,
    contractId: null as string | null,
    purchaseInvoiceId: null as string | null,
    salesInvoiceId: null as string | null,
    bankStatementId: null as string | null,
  };
  switch (data.linkType) {
    case "PROJECT":
      return { ...base, projectId: data.linkId! };
    case "CONTRACT":
      return { ...base, contractId: data.linkId! };
    case "PURCHASE_INVOICE":
      return { ...base, purchaseInvoiceId: data.linkId! };
    case "SALES_INVOICE":
      return { ...base, salesInvoiceId: data.linkId! };
    case "BANK_STATEMENT":
      return { ...base, bankStatementId: data.linkId! };
    default:
      return base;
  }
}

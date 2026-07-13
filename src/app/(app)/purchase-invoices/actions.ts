"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withUser } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/authorization";
import {
  purchaseInvoiceSchema,
  toPurchaseInvoiceData,
  type PurchaseInvoiceInput,
} from "./schema";

export type PurchaseInvoiceFormState = {
  errors?: Partial<Record<keyof PurchaseInvoiceInput, string[]>>;
  message?: string;
  values?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  return {
    number: String(formData.get("number") ?? ""),
    sefNumber: String(formData.get("sefNumber") ?? ""),
    vendorId: String(formData.get("vendorId") ?? ""),
    projectId: String(formData.get("projectId") ?? ""),
    contractId: String(formData.get("contractId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    currency: String(formData.get("currency") ?? "EUR"),
    issueDate: String(formData.get("issueDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
  };
}

export async function createPurchaseInvoice(
  _prevState: PurchaseInvoiceFormState,
  formData: FormData,
): Promise<PurchaseInvoiceFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = purchaseInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).purchaseInvoice.create({ data: toPurchaseInvoiceData(parsed.data) });
  revalidatePath("/purchase-invoices");
  redirect("/purchase-invoices");
}

export async function updatePurchaseInvoice(
  id: string,
  _prevState: PurchaseInvoiceFormState,
  formData: FormData,
): Promise<PurchaseInvoiceFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const existing = await prisma.purchaseInvoice.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) return { message: "Invoice not found.", values: raw };
  if (existing.status !== "RECEIVED") {
    return {
      message: "This invoice can no longer be edited once submitted for approval.",
      values: raw,
    };
  }

  const parsed = purchaseInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).purchaseInvoice.update({
    where: { id },
    data: toPurchaseInvoiceData(parsed.data),
  });
  revalidatePath("/purchase-invoices");
  revalidatePath(`/purchase-invoices/${id}`);
  redirect("/purchase-invoices");
}

export async function removePurchaseInvoice(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  const existing = await prisma.purchaseInvoice.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) throw new Error("Invoice not found.");
  if (existing.status !== "RECEIVED" && existing.status !== "CANCELLED") {
    throw new Error("Only invoices that are still RECEIVED or already CANCELLED can be deleted.");
  }

  await withUser(user.id).purchaseInvoice.delete({ where: { id } });
  revalidatePath("/purchase-invoices");
}

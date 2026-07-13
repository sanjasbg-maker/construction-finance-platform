"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withUser } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/authorization";
import { salesInvoiceSchema, toSalesInvoiceData, type SalesInvoiceInput } from "./schema";

export type SalesInvoiceFormState = {
  errors?: Partial<Record<keyof SalesInvoiceInput, string[]>>;
  message?: string;
  values?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  return {
    number: String(formData.get("number") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    projectId: String(formData.get("projectId") ?? ""),
    contractId: String(formData.get("contractId") ?? ""),
    situationId: String(formData.get("situationId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    currency: String(formData.get("currency") ?? "EUR"),
    issueDate: String(formData.get("issueDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
  };
}

export async function createSalesInvoice(
  _prevState: SalesInvoiceFormState,
  formData: FormData,
): Promise<SalesInvoiceFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = salesInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).salesInvoice.create({ data: toSalesInvoiceData(parsed.data) });
  revalidatePath("/sales-invoices");
  redirect("/sales-invoices");
}

export async function updateSalesInvoice(
  id: string,
  _prevState: SalesInvoiceFormState,
  formData: FormData,
): Promise<SalesInvoiceFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = salesInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).salesInvoice.update({
    where: { id },
    data: toSalesInvoiceData(parsed.data),
  });
  revalidatePath("/sales-invoices");
  redirect("/sales-invoices");
}

export async function removeSalesInvoice(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  await withUser(user.id).salesInvoice.delete({ where: { id } });
  revalidatePath("/sales-invoices");
}

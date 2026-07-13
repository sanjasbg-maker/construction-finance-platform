"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withUser } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/authorization";
import { paymentSchema, toPaymentData, type PaymentInput } from "./schema";

export type PaymentFormState = {
  errors?: Partial<Record<keyof PaymentInput, string[]>>;
  message?: string;
  values?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  return {
    purpose: String(formData.get("purpose") ?? "VENDOR_ADVANCE"),
    vendorId: String(formData.get("vendorId") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    advancePercent: String(formData.get("advancePercent") ?? ""),
    bankAccountId: String(formData.get("bankAccountId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    currency: String(formData.get("currency") ?? "EUR"),
    date: String(formData.get("date") ?? ""),
  };
}

export async function createPayment(
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  const payment = await withUser(user.id).payment.create({ data: toPaymentData(parsed.data) });
  revalidatePath("/treasury");
  redirect(`/treasury/${payment.id}`);
}

export async function updatePayment(
  id: string,
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const allocationCount = await prisma.paymentAllocation.count({ where: { paymentId: id } });
  if (allocationCount > 0) {
    return {
      message: "This payment already has allocations and can no longer be edited.",
      values: raw,
    };
  }

  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).payment.update({ where: { id }, data: toPaymentData(parsed.data) });
  revalidatePath("/treasury");
  revalidatePath(`/treasury/${id}`);
  redirect(`/treasury/${id}`);
}

export async function removePayment(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  const allocationCount = await prisma.paymentAllocation.count({ where: { paymentId: id } });
  if (allocationCount > 0) {
    throw new Error("This payment already has allocations and can no longer be deleted.");
  }

  await withUser(user.id).payment.delete({ where: { id } });
  revalidatePath("/treasury");
}

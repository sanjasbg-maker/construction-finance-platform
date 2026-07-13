"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withUser } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/authorization";
import { retentionSchema, toRetentionData, type RetentionInput } from "./schema";

export type RetentionFormState = {
  errors?: Partial<Record<keyof RetentionInput, string[]>>;
  message?: string;
  values?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  return {
    contractId: String(formData.get("contractId") ?? ""),
    direction: String(formData.get("direction") ?? "COMPANY_FROM_VENDOR"),
    linkedInvoiceId: String(formData.get("linkedInvoiceId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    currency: String(formData.get("currency") ?? "EUR"),
    percent: String(formData.get("percent") ?? ""),
    status: String(formData.get("status") ?? "HELD"),
    releaseDate: String(formData.get("releaseDate") ?? ""),
  };
}

export async function createRetention(
  _prevState: RetentionFormState,
  formData: FormData,
): Promise<RetentionFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = retentionSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).retention.create({ data: toRetentionData(parsed.data) });
  revalidatePath("/retentions");
  revalidatePath("/reports");
  redirect("/retentions");
}

export async function updateRetention(
  id: string,
  _prevState: RetentionFormState,
  formData: FormData,
): Promise<RetentionFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = retentionSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).retention.update({
    where: { id },
    data: toRetentionData(parsed.data),
  });
  revalidatePath("/retentions");
  revalidatePath("/reports");
  redirect("/retentions");
}

export async function removeRetention(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  await withUser(user.id).retention.delete({ where: { id } });
  revalidatePath("/retentions");
  revalidatePath("/reports");
}

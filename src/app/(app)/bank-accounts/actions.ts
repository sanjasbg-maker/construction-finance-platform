"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { withUser } from "@/lib/prisma";
import { bankAccountSchema, toBankAccountData, type BankAccountInput } from "./schema";

export type BankAccountFormState = {
  errors?: Partial<Record<keyof BankAccountInput, string[]>>;
  message?: string;
  values?: Record<string, string>;
};

async function requireWriteAccess() {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: "No active user. Select one from the sidebar." };
  }
  if (user.role === "VIEWER") {
    return { user: null, error: "Viewers cannot make changes." };
  }
  return { user, error: null as string | null };
}

function parseFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    iban: String(formData.get("iban") ?? ""),
    currency: String(formData.get("currency") ?? "EUR"),
  };
}

export async function createBankAccount(
  _prevState: BankAccountFormState,
  formData: FormData,
): Promise<BankAccountFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = bankAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).bankAccount.create({ data: toBankAccountData(parsed.data) });
  revalidatePath("/bank-accounts");
  redirect("/bank-accounts");
}

export async function updateBankAccount(
  id: string,
  _prevState: BankAccountFormState,
  formData: FormData,
): Promise<BankAccountFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = bankAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).bankAccount.update({
    where: { id },
    data: toBankAccountData(parsed.data),
  });
  revalidatePath("/bank-accounts");
  redirect("/bank-accounts");
}

export async function removeBankAccount(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  await withUser(user.id).bankAccount.delete({ where: { id } });
  revalidatePath("/bank-accounts");
}

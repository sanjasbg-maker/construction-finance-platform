"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { withUser } from "@/lib/prisma";
import { contractSchema, toContractData, type ContractInput } from "./schema";

export type ContractFormState = {
  errors?: Partial<Record<keyof ContractInput, string[]>>;
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
    number: String(formData.get("number") ?? ""),
    date: String(formData.get("date") ?? ""),
    projectId: String(formData.get("projectId") ?? ""),
    value: String(formData.get("value") ?? ""),
    currency: String(formData.get("currency") ?? "EUR"),
    retentionPercent: String(formData.get("retentionPercent") ?? ""),
    status: String(formData.get("status") ?? "DRAFT"),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
  };
}

export async function createContract(
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = contractSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).contract.create({ data: toContractData(parsed.data) });
  revalidatePath("/contracts");
  redirect("/contracts");
}

export async function updateContract(
  id: string,
  _prevState: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = contractSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).contract.update({
    where: { id },
    data: toContractData(parsed.data),
  });
  revalidatePath("/contracts");
  redirect("/contracts");
}

export async function removeContract(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  await withUser(user.id).contract.delete({ where: { id } });
  revalidatePath("/contracts");
}

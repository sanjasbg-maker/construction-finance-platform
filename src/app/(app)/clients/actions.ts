"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { withUser } from "@/lib/prisma";
import { clientSchema, toClientData, type ClientInput } from "./schema";

export type ClientFormState = {
  errors?: Partial<Record<keyof ClientInput, string[]>>;
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
    taxId: String(formData.get("taxId") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    openingBalance: String(formData.get("openingBalance") ?? ""),
    openingBalanceCurrency: String(formData.get("openingBalanceCurrency") ?? "EUR"),
  };
}

export async function createClient(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).client.create({ data: toClientData(parsed.data) });
  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClient(
  id: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).client.update({
    where: { id },
    data: toClientData(parsed.data),
  });
  revalidatePath("/clients");
  redirect("/clients");
}

export async function removeClient(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  await withUser(user.id).client.delete({ where: { id } });
  revalidatePath("/clients");
}

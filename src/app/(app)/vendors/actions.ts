"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { withUser } from "@/lib/prisma";
import { vendorSchema, toVendorData, type VendorInput } from "./schema";

export type VendorFormState = {
  errors?: Partial<Record<keyof VendorInput, string[]>>;
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
    paymentTerms: String(formData.get("paymentTerms") ?? ""),
    openingBalance: String(formData.get("openingBalance") ?? ""),
    openingBalanceCurrency: String(formData.get("openingBalanceCurrency") ?? "EUR"),
  };
}

export async function createVendor(
  _prevState: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = vendorSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).vendor.create({ data: toVendorData(parsed.data) });
  revalidatePath("/vendors");
  redirect("/vendors");
}

export async function updateVendor(
  id: string,
  _prevState: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = vendorSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).vendor.update({
    where: { id },
    data: toVendorData(parsed.data),
  });
  revalidatePath("/vendors");
  redirect("/vendors");
}

export async function removeVendor(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  await withUser(user.id).vendor.delete({ where: { id } });
  revalidatePath("/vendors");
}

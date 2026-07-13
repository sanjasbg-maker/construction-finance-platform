"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, withUser } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";
import { userSchema, toUserData, type UserInput } from "./schema";

export type UserFormState = {
  errors?: Partial<Record<keyof UserInput, string[]>>;
  message?: string;
  values?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
  };
}

/** Counts ADMIN users, optionally excluding one (the user being edited/deleted),
 * so callers can check "would this leave zero Administrators behind?". */
async function countOtherAdmins(excludeUserId: string) {
  return prisma.user.count({ where: { role: "ADMIN", id: { not: excludeUserId } } });
}

export async function createUser(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireRole(["ADMIN"]);
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = userSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { message: "A user with this email already exists.", values: raw };
  }

  await withUser(user.id).user.create({ data: toUserData(parsed.data) });
  revalidatePath("/administration");
  redirect("/administration");
}

export async function updateUser(
  id: string,
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const raw = parseFormData(formData);
  const { user, error } = await requireRole(["ADMIN"]);
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = userSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing && existing.id !== id) {
    return { message: "A user with this email already exists.", values: raw };
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (target?.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const remainingAdmins = await countOtherAdmins(id);
    if (remainingAdmins === 0) {
      return { message: "Can't remove the last Administrator.", values: raw };
    }
  }

  await withUser(user.id).user.update({ where: { id }, data: toUserData(parsed.data) });
  revalidatePath("/administration");
  redirect("/administration");
}

export async function removeUser(id: string) {
  const { user, error } = await requireRole(["ADMIN"]);
  if (error || !user) throw new Error(error ?? "Unauthorized");

  if (id === user.id) {
    throw new Error("You can't delete your own account while acting as it.");
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (target?.role === "ADMIN") {
    const remainingAdmins = await countOtherAdmins(id);
    if (remainingAdmins === 0) {
      throw new Error("Can't delete the last Administrator.");
    }
  }

  await withUser(user.id).user.delete({ where: { id } });
  revalidatePath("/administration");
}

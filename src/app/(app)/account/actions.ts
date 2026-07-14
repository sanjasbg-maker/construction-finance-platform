"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { withUser } from "@/lib/prisma";

export type ChangePasswordFormState = {
  message?: string;
  success?: boolean;
};

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "No active session." };

  const raw = {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (
    !user.passwordHash ||
    !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))
  ) {
    return { message: "Current password is incorrect." };
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await withUser(user.id).user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { success: true, message: "Password changed." };
}

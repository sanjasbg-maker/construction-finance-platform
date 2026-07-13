import { z } from "zod";

export const ROLES = ["ADMIN", "DIRECTOR", "FINANCE", "PROJECT_MANAGER", "VIEWER"] as const;

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(ROLES),
});

export type UserInput = z.infer<typeof userSchema>;

export function toUserData(data: UserInput) {
  return { name: data.name, email: data.email, role: data.role };
}

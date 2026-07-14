import { z } from "zod";

export const ROLES = ["ADMIN", "DIRECTOR", "FINANCE", "PROJECT_MANAGER", "VIEWER"] as const;

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(ROLES),
  // On create: blank means "no password yet" (the user can't log in until an
  // ADMIN sets one). On edit: blank means "leave the existing password
  // unchanged" - see actions.ts, which hashes this separately from
  // toUserData since hashing is async.
  password: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || v.length >= 8, "Password must be at least 8 characters"),
});

export type UserInput = z.infer<typeof userSchema>;

export function toUserData(data: UserInput) {
  return { name: data.name, email: data.email, role: data.role };
}

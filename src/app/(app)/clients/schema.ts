import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  taxId: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof clientSchema>;

/** Converts empty-string optionals (from a submitted form) to null for storage. */
export function toClientData(input: ClientInput) {
  return {
    name: input.name,
    taxId: input.taxId || null,
    email: input.email || null,
    phone: input.phone || null,
  };
}

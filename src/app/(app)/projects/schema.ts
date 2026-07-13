import { z } from "zod";

export const projectStatuses = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

const editableFields = {
  name: z.string().trim().min(1, "Name is required").max(200),
  clientId: z.string().trim().min(1, "Client is required"),
  status: z.enum(projectStatuses),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
};

// Code is only settable on create - per CLAUDE.md, "Project Code is immutable" -
// so the update schema deliberately omits it rather than accepting and ignoring it.
export const createProjectSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(50),
  ...editableFields,
});

export const updateProjectSchema = z.object(editableFields);

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

function toDate(value: string) {
  return value ? new Date(value) : null;
}

export function toCreateProjectData(input: CreateProjectInput) {
  return {
    name: input.name,
    code: input.code,
    clientId: input.clientId,
    status: input.status,
    startDate: toDate(input.startDate ?? ""),
    endDate: toDate(input.endDate ?? ""),
  };
}

export function toUpdateProjectData(input: UpdateProjectInput) {
  return {
    name: input.name,
    clientId: input.clientId,
    status: input.status,
    startDate: toDate(input.startDate ?? ""),
    endDate: toDate(input.endDate ?? ""),
  };
}

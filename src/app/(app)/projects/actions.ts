"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { withUser } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  createProjectSchema,
  updateProjectSchema,
  toCreateProjectData,
  toUpdateProjectData,
  type CreateProjectInput,
} from "./schema";

export type ProjectFormState = {
  errors?: Partial<Record<keyof CreateProjectInput, string[]>>;
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

function parseCreateFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
  };
}

function parseUpdateFormData(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    status: String(formData.get("status") ?? "ACTIVE"),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
  };
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const raw = parseCreateFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  try {
    await withUser(user.id).project.create({ data: toCreateProjectData(parsed.data) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { message: "That project code is already in use.", values: raw };
    }
    throw err;
  }
  revalidatePath("/projects");
  redirect("/projects");
}

export async function updateProject(
  id: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const raw = parseUpdateFormData(formData);
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { message: error ?? "Unauthorized", values: raw };

  const parsed = updateProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values: raw };
  }

  await withUser(user.id).project.update({
    where: { id },
    data: toUpdateProjectData(parsed.data),
  });
  revalidatePath("/projects");
  redirect("/projects");
}

export async function removeProject(id: string) {
  const { user, error } = await requireWriteAccess();
  if (error || !user) throw new Error(error ?? "Unauthorized");

  await withUser(user.id).project.delete({ where: { id } });
  revalidatePath("/projects");
}

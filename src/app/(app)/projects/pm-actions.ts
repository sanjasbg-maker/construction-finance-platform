"use server";

import { revalidatePath } from "next/cache";
import { prisma, withUser } from "@/lib/prisma";
import { requireRole } from "@/lib/authorization";

/** Reassigning a PM ends the current assignment (endDate = now) and starts a
 * new one, rather than overwriting it in place - BUSINESS_RULES.md #1 requires
 * PM history to be preserved, not just the current PM. */
export async function assignProjectManager(projectId: string, newPmUserId: string) {
  const { user, error } = await requireRole(["ADMIN", "DIRECTOR"]);
  if (error || !user) throw new Error(error ?? "Unauthorized");

  const newPm = await prisma.user.findUnique({ where: { id: newPmUserId } });
  if (!newPm) throw new Error("User not found.");
  if (newPm.role !== "PROJECT_MANAGER" && newPm.role !== "ADMIN") {
    throw new Error("Only users with the Project Manager role can be assigned.");
  }

  await withUser(user.id).$transaction(async (tx) => {
    const current = await tx.projectManagerAssignment.findFirst({
      where: { projectId, endDate: null },
      orderBy: { startDate: "desc" },
    });
    if (current?.userId === newPmUserId) return;
    if (current) {
      await tx.projectManagerAssignment.update({
        where: { id: current.id },
        data: { endDate: new Date() },
      });
    }
    await tx.projectManagerAssignment.create({
      data: { projectId, userId: newPmUserId, startDate: new Date() },
    });
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}/edit`);
}

export async function unassignProjectManager(projectId: string) {
  const { user, error } = await requireRole(["ADMIN", "DIRECTOR"]);
  if (error || !user) throw new Error(error ?? "Unauthorized");

  const current = await prisma.projectManagerAssignment.findFirst({
    where: { projectId, endDate: null },
    orderBy: { startDate: "desc" },
  });
  if (current) {
    await withUser(user.id).projectManagerAssignment.update({
      where: { id: current.id },
      data: { endDate: new Date() },
    });
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}/edit`);
}

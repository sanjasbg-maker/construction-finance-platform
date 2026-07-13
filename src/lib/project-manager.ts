import { prisma } from "@/lib/prisma";

/** The "current" assignment for a project is the one with no endDate yet.
 * History (past assignments) is preserved by ending the old row instead of
 * deleting it - see pm-actions.ts. */
export async function getCurrentPm(projectId: string) {
  return prisma.projectManagerAssignment.findFirst({
    where: { projectId, endDate: null },
    orderBy: { startDate: "desc" },
    include: { user: true },
  });
}

/** Batched version for list pages - one query instead of one per row. */
export async function getCurrentPmsByProject(projectIds: string[]) {
  const assignments = await prisma.projectManagerAssignment.findMany({
    where: { projectId: { in: projectIds }, endDate: null },
    include: { user: true },
  });

  const map = new Map<string, (typeof assignments)[number]>();
  for (const assignment of assignments) {
    const existing = map.get(assignment.projectId);
    if (!existing || assignment.startDate > existing.startDate) {
      map.set(assignment.projectId, assignment);
    }
  }
  return map;
}

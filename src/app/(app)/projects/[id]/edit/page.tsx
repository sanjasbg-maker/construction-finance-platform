import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { getCurrentPm } from "@/lib/project-manager";
import { ProjectForm } from "../../ProjectForm";
import { PmAssignment } from "../../PmAssignment";
import { updateProject } from "../../actions";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, clients, currentPm, pmOptions, currentUser] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getCurrentPm(id),
    prisma.user.findMany({
      where: { role: { in: ["PROJECT_MANAGER", "ADMIN"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getCurrentUser(),
  ]);

  if (!project) {
    notFound();
  }

  const canManagePm = currentUser?.role === "ADMIN" || currentUser?.role === "DIRECTOR";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Project
      </h1>
      <ProjectForm
        mode="edit"
        action={updateProject.bind(null, id)}
        clients={clients}
        defaultValues={project}
      />

      <div className="max-w-lg border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Project Manager
        </h2>
        <p className="mb-3 text-xs text-zinc-400 dark:text-zinc-500">
          Reassigning ends the current assignment and starts a new one - history is kept,
          not overwritten.
        </p>
        <PmAssignment
          projectId={id}
          currentPm={currentPm ? { id: currentPm.user.id, name: currentPm.user.name } : null}
          options={pmOptions}
          canManage={canManagePm}
        />
      </div>
    </div>
  );
}

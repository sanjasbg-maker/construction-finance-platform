import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "../ProjectForm";
import { createProject } from "../actions";

export default async function NewProjectPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add Project
      </h1>
      {clients.length === 0 ? (
        <p className="max-w-lg rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          A project needs a client. Please{" "}
          <Link href="/clients/new" className="underline">
            add a client
          </Link>{" "}
          first.
        </p>
      ) : (
        <ProjectForm mode="create" action={createProject} clients={clients} />
      )}
    </div>
  );
}

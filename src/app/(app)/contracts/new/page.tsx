import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ContractForm } from "../ContractForm";
import { createContract } from "../actions";

export default async function NewContractPage() {
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add Contract
      </h1>
      {projects.length === 0 ? (
        <p className="max-w-lg rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          A contract needs a project. Please{" "}
          <Link href="/projects/new" className="underline">
            add a project
          </Link>{" "}
          first.
        </p>
      ) : (
        <ContractForm action={createContract} projects={projects} />
      )}
    </div>
  );
}

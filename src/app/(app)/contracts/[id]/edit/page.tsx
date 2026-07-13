import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContractForm } from "../../ContractForm";
import { updateContract } from "../../actions";

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contract, projects] = await Promise.all([
    prisma.contract.findUnique({ where: { id } }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
  ]);

  if (!contract) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Contract
      </h1>
      <ContractForm
        action={updateContract.bind(null, id)}
        projects={projects}
        defaultValues={{
          number: contract.number,
          date: contract.date,
          projectId: contract.projectId,
          value: contract.value.toString(),
          currency: contract.currency,
          retentionPercent: contract.retentionPercent?.toString() ?? null,
          status: contract.status,
          startDate: contract.startDate,
          endDate: contract.endDate,
        }}
      />
    </div>
  );
}

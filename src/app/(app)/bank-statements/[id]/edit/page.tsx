import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatementEditForm } from "../../StatementEditForm";
import { updateStatement } from "../../actions";

export default async function EditBankStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const statement = await prisma.bankStatement.findUnique({ where: { id } });

  if (!statement) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Bank Statement
      </h1>
      <StatementEditForm
        action={updateStatement.bind(null, id)}
        defaultValues={{
          fileName: statement.fileName,
          periodStart: statement.periodStart,
          periodEnd: statement.periodEnd,
        }}
      />
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/DeleteButton";
import { removeStatement } from "./actions";

export default async function BankStatementsPage() {
  const statements = await prisma.bankStatement.findMany({
    include: { bankAccount: true, transactions: true },
    orderBy: { importedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Bank Statements
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Import CSV statements and reconcile transactions against Treasury payments.
          </p>
        </div>
        <Link
          href="/bank-statements/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Import Statement
        </Link>
      </div>

      {statements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No statements imported yet.{" "}
          <Link href="/bank-statements/new" className="underline">
            Import the first one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Bank Account</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Reconciled</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {statements.map((statement) => {
                const reconciledCount = statement.transactions.filter((t) => t.reconciled).length;
                const canDelete = reconciledCount === 0;
                return (
                  <tr key={statement.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      <Link href={`/bank-statements/${statement.id}`} className="hover:underline">
                        {statement.fileName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {statement.bankAccount.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {statement.periodStart?.toISOString().slice(0, 10) ?? "—"} –{" "}
                      {statement.periodEnd?.toISOString().slice(0, 10) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {reconciledCount} / {statement.transactions.length}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/bank-statements/${statement.id}`}
                          className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                        >
                          View
                        </Link>
                        {canDelete && (
                          <DeleteButton
                            action={removeStatement.bind(null, statement.id)}
                            confirmMessage={`Delete statement "${statement.fileName}" and its ${statement.transactions.length} transactions? This can't be undone from the UI yet.`}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

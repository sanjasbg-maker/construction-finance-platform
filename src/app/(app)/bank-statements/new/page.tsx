import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatementImportForm } from "../StatementImportForm";
import { importStatement } from "../actions";

export default async function NewBankStatementPage() {
  const bankAccounts = await prisma.bankAccount.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, currency: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Import Bank Statement
      </h1>
      {bankAccounts.length === 0 ? (
        <p className="max-w-lg rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          A statement needs a bank account. Please{" "}
          <Link href="/bank-accounts/new" className="underline">
            add a bank account
          </Link>{" "}
          first.
        </p>
      ) : (
        <StatementImportForm action={importStatement} bankAccounts={bankAccounts} />
      )}
    </div>
  );
}

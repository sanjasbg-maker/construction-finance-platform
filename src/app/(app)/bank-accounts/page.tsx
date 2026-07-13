import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listUsers } from "@/lib/current-user";
import { DeleteButton } from "@/components/DeleteButton";
import { removeBankAccount } from "./actions";

export default async function BankAccountsPage() {
  const [accounts, users] = await Promise.all([
    prisma.bankAccount.findMany({ orderBy: { name: "asc" } }),
    listUsers(),
  ]);

  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Bank Accounts
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Company bank accounts across currencies and banks.
          </p>
        </div>
        <Link
          href="/bank-accounts/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add Bank Account
        </Link>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No bank accounts yet.{" "}
          <Link href="/bank-accounts/new" className="underline">
            Add the first one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">IBAN</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Created by</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {account.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {account.iban ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {account.currency}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {(account.createdBy && userNameById.get(account.createdBy)) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/bank-accounts/${account.id}/edit`}
                        className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        action={removeBankAccount.bind(null, account.id)}
                        confirmMessage={`Delete ${account.name}? This can't be undone from the UI yet.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

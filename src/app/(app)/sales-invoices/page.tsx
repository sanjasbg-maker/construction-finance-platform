import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listUsers } from "@/lib/current-user";
import { DeleteButton } from "@/components/DeleteButton";
import { removeSalesInvoice } from "./actions";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function formatMoney(value: unknown, currency: string) {
  return `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default async function SalesInvoicesPage() {
  const [invoices, users] = await Promise.all([
    prisma.salesInvoice.findMany({
      include: { client: true, project: true },
      orderBy: { issueDate: "desc" },
    }),
    listUsers(),
  ]);

  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Sales Invoices
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Client invoices, typically issued from an approved Situation (progress certificate).
          </p>
        </div>
        <Link
          href="/sales-invoices/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add Sales Invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No sales invoices yet.{" "}
          <Link href="/sales-invoices/new" className="underline">
            Add the first one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created by</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {invoice.number}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {invoice.client.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {invoice.project.code}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatMoney(invoice.amount, invoice.currency)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {invoice.dueDate.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[invoice.status] ?? ""}`}
                    >
                      {invoice.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {(invoice.createdBy && userNameById.get(invoice.createdBy)) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/sales-invoices/${invoice.id}/edit`}
                        className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        action={removeSalesInvoice.bind(null, invoice.id)}
                        confirmMessage={`Delete invoice ${invoice.number}? This can't be undone from the UI yet.`}
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

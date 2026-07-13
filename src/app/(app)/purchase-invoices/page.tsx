import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/DeleteButton";
import { removePurchaseInvoice } from "./actions";

const statusStyles: Record<string, string> = {
  RECEIVED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  WAITING_PM_APPROVAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  WAITING_DIRECTOR_APPROVAL: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  READY_FOR_PAYMENT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  PARTIALLY_PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  PAID: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const deletableStatuses = new Set(["RECEIVED", "CANCELLED"]);

function formatMoney(value: unknown, currency: string) {
  return `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default async function PurchaseInvoicesPage() {
  const invoices = await prisma.purchaseInvoice.findMany({
    include: { vendor: true, project: true },
    orderBy: { issueDate: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Purchase Invoices
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Vendor invoices received via SEF, through PM, Finance, and Director approval to payment.
          </p>
        </div>
        <Link
          href="/purchase-invoices/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add Purchase Invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No purchase invoices yet.{" "}
          <Link href="/purchase-invoices/new" className="underline">
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
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    <Link href={`/purchase-invoices/${invoice.id}`} className="hover:underline">
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {invoice.vendor.name}
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
                      {invoice.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/purchase-invoices/${invoice.id}`}
                        className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                      >
                        View
                      </Link>
                      {deletableStatuses.has(invoice.status) && (
                        <DeleteButton
                          action={removePurchaseInvoice.bind(null, invoice.id)}
                          confirmMessage={`Delete invoice ${invoice.number}? This can't be undone from the UI yet.`}
                        />
                      )}
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

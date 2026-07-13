import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/DeleteButton";
import { removePayment } from "./actions";

function describePayment(type: string, direction: string) {
  if (type === "VENDOR_ADVANCE") return "Advance to Vendor";
  if (type === "CLIENT_ADVANCE") return "Advance from Client";
  if (type === "RETENTION_RELEASE") return "Retention Release";
  return direction === "OUT" ? "Vendor Invoice Settlement" : "Client Invoice Settlement";
}

function formatMoney(value: unknown, currency: string) {
  return `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export default async function TreasuryPage() {
  const payments = await prisma.payment.findMany({
    include: { bankAccount: true, vendor: true, client: true, allocations: true },
    orderBy: { date: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Treasury
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Advance payments, invoice settlements, and retention releases across all bank accounts.
          </p>
        </div>
        <Link
          href="/treasury/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add Payment
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No payments yet.{" "}
          <Link href="/treasury/new" className="underline">
            Add the first one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium">Bank Account</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Allocated</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {payments.map((payment) => {
                const allocated = payment.allocations.reduce(
                  (acc, a) => acc + Number(a.amount),
                  0,
                );
                return (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          payment.direction === "IN"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {payment.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      <Link href={`/treasury/${payment.id}`} className="hover:underline">
                        {describePayment(payment.type, payment.direction)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {payment.vendor?.name ?? payment.client?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {payment.bankAccount.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatMoney(allocated, payment.currency)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {payment.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/treasury/${payment.id}`}
                          className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                        >
                          View
                        </Link>
                        {payment.allocations.length === 0 && (
                          <DeleteButton
                            action={removePayment.bind(null, payment.id)}
                            confirmMessage="Delete this payment? This can't be undone from the UI yet."
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

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { DeleteButton } from "@/components/DeleteButton";
import { removeRetention } from "./actions";

const statusStyles: Record<string, string> = {
  HELD: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PARTIALLY_RELEASED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  RELEASED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

const directionLabels: Record<string, string> = {
  COMPANY_FROM_VENDOR: "We retain from Vendor",
  CLIENT_FROM_COMPANY: "Client retains from us",
};

export default async function RetentionsPage() {
  const retentions = await prisma.retention.findMany({
    include: {
      contract: { include: { project: true } },
      purchaseInvoice: { include: { vendor: true } },
      salesInvoice: { include: { client: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Retention</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Guarantee deposits withheld from Vendors and by Clients, tracked separately from
            regular invoice payments.
          </p>
        </div>
        <Link
          href="/retentions/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add Retention
        </Link>
      </div>

      {retentions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No retention recorded yet.{" "}
          <Link href="/retentions/new" className="underline">
            Add the first one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">Direction</th>
                <th className="px-4 py-3 font-medium">Linked Invoice</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Release Date</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {retentions.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {r.contract.number}{" "}
                    <span className="font-normal text-zinc-400 dark:text-zinc-500">
                      ({r.contract.project.code})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {directionLabels[r.direction] ?? r.direction}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {r.purchaseInvoice
                      ? `${r.purchaseInvoice.number} (${r.purchaseInvoice.vendor.name})`
                      : r.salesInvoice
                        ? `${r.salesInvoice.number} (${r.salesInvoice.client.name})`
                        : "— Not linked —"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatMoney(r.amount, r.currency)}
                    {r.percent && (
                      <span className="text-zinc-400 dark:text-zinc-500"> ({r.percent.toString()}%)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[r.status] ?? ""}`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {r.releaseDate ? r.releaseDate.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/retentions/${r.id}/edit`}
                        className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        action={removeRetention.bind(null, r.id)}
                        confirmMessage={`Delete this retention record (${formatMoney(r.amount, r.currency)})? This can't be undone from the UI yet.`}
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

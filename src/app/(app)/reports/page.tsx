import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sumDecimal, formatMoney } from "@/lib/money";

const OUTSTANDING_PURCHASE_STATUSES = [
  "RECEIVED",
  "WAITING_PM_APPROVAL",
  "APPROVED",
  "WAITING_DIRECTOR_APPROVAL",
  "READY_FOR_PAYMENT",
  "PARTIALLY_PAID",
] as const;

const OUTSTANDING_SALES_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

/** Sums are never blended across currencies (no FX conversion in this app) -
 * this groups by currency and formats each subtotal separately. */
function sumByCurrency(rows: { amount: number; currency: string }[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount);
  }
  return Array.from(totals.entries());
}

function formatMultiCurrency(rows: { amount: number; currency: string }[]) {
  const totals = sumByCurrency(rows);
  if (totals.length === 0) return "—";
  return totals.map(([currency, amount]) => formatMoney(amount, currency)).join(" + ");
}

export default async function ReportsPage() {
  const now = new Date();

  const [purchaseInvoices, salesInvoices, bankAccounts, projects] = await Promise.all([
    prisma.purchaseInvoice.findMany({
      where: { status: { in: [...OUTSTANDING_PURCHASE_STATUSES] } },
      include: { vendor: true, project: true, allocations: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.salesInvoice.findMany({
      where: { status: { in: [...OUTSTANDING_SALES_STATUSES] } },
      include: { client: true, project: true, allocations: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.bankAccount.findMany({
      include: { payments: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      include: { client: true, contracts: true, purchaseInvoices: true, salesInvoices: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const payablesRows = purchaseInvoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    party: inv.vendor.name,
    project: inv.project.code,
    currency: inv.currency,
    remaining: Number(inv.amount) - sumDecimal(inv.allocations),
    dueDate: inv.dueDate,
    overdue: inv.dueDate < now,
  }));

  const receivablesRows = salesInvoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    party: inv.client.name,
    project: inv.project.code,
    currency: inv.currency,
    remaining: Number(inv.amount) - sumDecimal(inv.allocations),
    dueDate: inv.dueDate,
    overdue: inv.dueDate < now,
  }));

  const cashRows = bankAccounts.map((account) => {
    const net = account.payments.reduce(
      (acc, p) => acc + (p.direction === "IN" ? Number(p.amount) : -Number(p.amount)),
      0,
    );
    return { id: account.id, name: account.name, currency: account.currency, net };
  });

  const projectRows = projects.map((project) => ({
    id: project.id,
    code: project.code,
    name: project.name,
    client: project.client.name,
    status: project.status,
    contractValue: project.contracts.map((c) => ({ amount: Number(c.value), currency: c.currency })),
    purchaseTotal: project.purchaseInvoices.map((i) => ({ amount: Number(i.amount), currency: i.currency })),
    salesTotal: project.salesInvoices.map((i) => ({ amount: Number(i.amount), currency: i.currency })),
  }));

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          P&amp;L by project, cash flow, AR/AP aging, and budget-vs-actual reports.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Outstanding Payables
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Total: {formatMultiCurrency(payablesRows.map((r) => ({ amount: r.remaining, currency: r.currency })))}
          </span>
        </div>
        {payablesRows.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Remaining</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {payablesRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      <Link href={`/purchase-invoices/${row.id}`} className="hover:underline">
                        {row.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.party}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.project}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatMoney(row.remaining, row.currency)}
                    </td>
                    <td className={`px-4 py-3 ${row.overdue ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {row.dueDate.toISOString().slice(0, 10)}
                      {row.overdue && " (overdue)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Outstanding Receivables
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Total: {formatMultiCurrency(receivablesRows.map((r) => ({ amount: r.remaining, currency: r.currency })))}
          </span>
        </div>
        {receivablesRows.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Remaining</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {receivablesRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      {row.number}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.party}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.project}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatMoney(row.remaining, row.currency)}
                    </td>
                    <td className={`px-4 py-3 ${row.overdue ? "font-medium text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {row.dueDate.toISOString().slice(0, 10)}
                      {row.overdue && " (overdue)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Cash Position by Bank Account
        </h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Net of all recorded Treasury payments (incoming minus outgoing). Not a true bank
          balance — this app doesn&apos;t track opening balances.
        </p>
        {cashRows.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Bank Account</th>
                  <th className="px-4 py-3 font-medium">Net Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {cashRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      {row.name}
                    </td>
                    <td
                      className={`px-4 py-3 ${row.net < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"}`}
                    >
                      {formatMoney(row.net, row.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Project Summary
        </h2>
        {projectRows.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Contract Value</th>
                  <th className="px-4 py-3 font-medium">Purchase Invoiced</th>
                  <th className="px-4 py-3 font-medium">Sales Invoiced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {projectRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      <Link href={`/projects/${row.id}/edit`} className="hover:underline">
                        {row.code} — {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.client}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {row.status.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatMultiCurrency(row.contractValue)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatMultiCurrency(row.purchaseTotal)}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {formatMultiCurrency(row.salesTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyRow() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
      Nothing to show yet.
    </div>
  );
}

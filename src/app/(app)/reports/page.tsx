import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sumDecimal, sumByCurrency, formatMoney, formatMultiCurrency } from "@/lib/money";
import { AGING_BUCKETS, bucketByDueDate } from "@/lib/aging";

// Retention that hasn't been released yet doesn't have a firm date the way
// invoice due dates do (Retention.releaseDate is optional) - "Unscheduled"
// holds anything without one instead of guessing.
const FORECAST_BUCKETS = [...AGING_BUCKETS, "Unscheduled"] as const;
type ForecastBucket = (typeof FORECAST_BUCKETS)[number];

function bucketByReleaseDate(releaseDate: Date | null, now: Date): ForecastBucket {
  return releaseDate ? bucketByDueDate(releaseDate, now) : "Unscheduled";
}

const OUTSTANDING_PURCHASE_STATUSES = [
  "RECEIVED",
  "WAITING_PM_APPROVAL",
  "APPROVED",
  "WAITING_DIRECTOR_APPROVAL",
  "READY_FOR_PAYMENT",
  "PARTIALLY_PAID",
] as const;

const OUTSTANDING_SALES_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

export default async function ReportsPage() {
  const now = new Date();

  const [purchaseInvoices, salesInvoices, bankAccounts, projects, retentions, advancePayments] =
    await Promise.all([
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
      prisma.retention.findMany({ where: { status: { in: ["HELD", "PARTIALLY_RELEASED"] } } }),
      prisma.payment.findMany({
        where: { type: { in: ["VENDOR_ADVANCE", "CLIENT_ADVANCE"] } },
        include: { allocations: true },
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

  // Retention held against a specific invoice is deliberately unpaid/uncollected -
  // it shouldn't be projected as due on the invoice's own due date (it moves on
  // release, which is usually much later, per BUSINESS_RULES.md #7 "Retention is
  // never treated as payment"). Build per-invoice retained totals so the forecast
  // can net them out of the invoice's own bucket and bucket them separately by
  // releaseDate instead.
  const retainedByPurchaseInvoice = new Map<string, number>();
  const retainedBySalesInvoice = new Map<string, number>();
  for (const r of retentions) {
    if (r.direction === "COMPANY_FROM_VENDOR" && r.purchaseInvoiceId) {
      retainedByPurchaseInvoice.set(
        r.purchaseInvoiceId,
        (retainedByPurchaseInvoice.get(r.purchaseInvoiceId) ?? 0) + Number(r.amount),
      );
    }
    if (r.direction === "CLIENT_FROM_COMPANY" && r.salesInvoiceId) {
      retainedBySalesInvoice.set(
        r.salesInvoiceId,
        (retainedBySalesInvoice.get(r.salesInvoiceId) ?? 0) + Number(r.amount),
      );
    }
  }

  const forecastPayableRows = payablesRows.map((r) => ({
    ...r,
    remaining: Math.max(0, r.remaining - (retainedByPurchaseInvoice.get(r.id) ?? 0)),
  }));
  const forecastReceivableRows = receivablesRows.map((r) => ({
    ...r,
    remaining: Math.max(0, r.remaining - (retainedBySalesInvoice.get(r.id) ?? 0)),
  }));

  const retentionOutflowRows = retentions
    .filter((r) => r.direction === "COMPANY_FROM_VENDOR")
    .map((r) => ({ amount: Number(r.amount), currency: r.currency, releaseDate: r.releaseDate }));
  const retentionInflowRows = retentions
    .filter((r) => r.direction === "CLIENT_FROM_COMPANY")
    .map((r) => ({ amount: Number(r.amount), currency: r.currency, releaseDate: r.releaseDate }));

  const cashFlowBuckets = FORECAST_BUCKETS.map((bucket) => {
    const inflow = [
      ...forecastReceivableRows
        .filter((r) => bucketByDueDate(r.dueDate, now) === bucket)
        .map((r) => ({ amount: r.remaining, currency: r.currency })),
      ...retentionInflowRows
        .filter((r) => bucketByReleaseDate(r.releaseDate, now) === bucket)
        .map((r) => ({ amount: r.amount, currency: r.currency })),
    ];
    const outflow = [
      ...forecastPayableRows
        .filter((r) => bucketByDueDate(r.dueDate, now) === bucket)
        .map((r) => ({ amount: r.remaining, currency: r.currency })),
      ...retentionOutflowRows
        .filter((r) => bucketByReleaseDate(r.releaseDate, now) === bucket)
        .map((r) => ({ amount: r.amount, currency: r.currency })),
    ];
    const net = [...inflow, ...outflow.map((r) => ({ ...r, amount: -r.amount }))];
    return { bucket, inflow, outflow, net };
  });

  // Opening balance = current Cash Position (see below), summed across all bank
  // accounts per currency rather than per-account, since the forecast walks
  // forward as one running total per currency.
  const runningBalance = new Map<string, number>(
    sumByCurrency(cashRows.map((r) => ({ amount: r.net, currency: r.currency }))),
  );
  const openingBalanceEntries = Array.from(runningBalance.entries()).map(([currency, amount]) => ({
    amount,
    currency,
  }));
  const cashFlowRowsWithBalance = cashFlowBuckets.map((row) => {
    for (const [currency, amount] of sumByCurrency(row.net)) {
      runningBalance.set(currency, (runningBalance.get(currency) ?? 0) + amount);
    }
    const balance = Array.from(runningBalance.entries()).map(([currency, amount]) => ({ amount, currency }));
    return { ...row, balance };
  });

  // Advances are already-completed Payments (money already sent/received), so
  // they're already reflected in the opening balance above - re-adding them as
  // a projected future flow would double-count them. Shown separately, for
  // visibility into unconsumed prepayments only, not folded into the Net math.
  const advanceRows = advancePayments
    .map((p) => ({
      type: p.type,
      currency: p.currency,
      remaining: Number(p.originalAmount ?? p.amount) - sumDecimal(p.allocations),
    }))
    .filter((r) => r.remaining > 0.005);
  const vendorAdvancesUnconsumed = advanceRows
    .filter((r) => r.type === "VENDOR_ADVANCE")
    .map((r) => ({ amount: r.remaining, currency: r.currency }));
  const clientAdvancesUnconsumed = advanceRows
    .filter((r) => r.type === "CLIENT_ADVANCE")
    .map((r) => ({ amount: r.remaining, currency: r.currency }));

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
          Cash Flow Forecast (by due / release date)
        </h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Opening balance is today&apos;s Cash Position (below), then each period adds
          Outstanding Receivables and incoming (client-held) retention releases as inflow,
          and Outstanding Payables and outgoing (vendor-held) retention releases as outflow.
          Retention tied to a specific invoice is excluded from that invoice&apos;s own row
          here and counted on its release date instead - held-back money doesn&apos;t move on
          the invoice&apos;s due date. Retention without a release date falls into
          &quot;Unscheduled&quot;.
        </p>
        {(vendorAdvancesUnconsumed.length > 0 || clientAdvancesUnconsumed.length > 0) && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Unconsumed advances - already paid/received, already reflected in the opening
            balance below, not projected again as a future flow: paid to vendors{" "}
            {formatMultiCurrency(vendorAdvancesUnconsumed)}, received from clients{" "}
            {formatMultiCurrency(clientAdvancesUnconsumed)}.
          </p>
        )}
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Inflow</th>
                <th className="px-4 py-3 font-medium">Outflow</th>
                <th className="px-4 py-3 font-medium">Net</th>
                <th className="px-4 py-3 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <tr className="bg-zinc-50 dark:bg-zinc-950">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  Opening Balance
                </td>
                <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500">—</td>
                <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500">—</td>
                <td className="px-4 py-3 text-zinc-400 dark:text-zinc-500">—</td>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                  {formatMultiCurrency(openingBalanceEntries)}
                </td>
              </tr>
              {cashFlowRowsWithBalance.map((row) => (
                <tr key={row.bucket}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {row.bucket}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatMultiCurrency(row.inflow)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatMultiCurrency(row.outflow)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatMultiCurrency(row.net)}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {formatMultiCurrency(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

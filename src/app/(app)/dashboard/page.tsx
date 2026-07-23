import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sumDecimal, formatMoney, formatMultiCurrency } from "@/lib/money";

const OUTSTANDING_PURCHASE_STATUSES = [
  "RECEIVED",
  "WAITING_PM_APPROVAL",
  "APPROVED",
  "WAITING_DIRECTOR_APPROVAL",
  "READY_FOR_PAYMENT",
  "PARTIALLY_PAID",
] as const;

const OUTSTANDING_SALES_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
const CONTRACT_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "TERMINATED"] as const;

const UPCOMING_WINDOW_DAYS = 14;

export default async function DashboardPage() {
  const now = new Date();
  const upcomingCutoff = new Date(now);
  upcomingCutoff.setDate(upcomingCutoff.getDate() + UPCOMING_WINDOW_DAYS);

  const [
    purchaseInvoices,
    salesInvoices,
    bankAccounts,
    retentions,
    advancePayments,
    projectCounts,
    contractCounts,
    vendorsWithOpeningBalance,
    clientsWithOpeningBalance,
  ] = await Promise.all([
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
    prisma.retention.findMany({
      where: { status: { in: ["HELD", "PARTIALLY_RELEASED"] } },
    }),
    prisma.payment.findMany({
      where: { type: { in: ["VENDOR_ADVANCE", "CLIENT_ADVANCE"] } },
      include: { allocations: true, vendor: true, client: true },
    }),
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.contract.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.vendor.findMany({ where: { openingBalance: { not: 0 } } }),
    prisma.client.findMany({ where: { openingBalance: { not: 0 } } }),
  ]);

  const vendorOpeningBalanceRows = vendorsWithOpeningBalance.map((v) => ({
    amount: Number(v.openingBalance),
    currency: v.openingBalanceCurrency,
  }));
  const clientOpeningBalanceRows = clientsWithOpeningBalance.map((c) => ({
    amount: Number(c.openingBalance),
    currency: c.openingBalanceCurrency,
  }));

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

  const payablesOverdueCount = payablesRows.filter((r) => r.overdue).length;
  const receivablesOverdueCount = receivablesRows.filter((r) => r.overdue).length;

  const cashRows = bankAccounts.map((account) => {
    const net = account.payments.reduce(
      (acc, p) => acc + (p.direction === "IN" ? Number(p.amount) : -Number(p.amount)),
      Number(account.openingBalance),
    );
    return { id: account.id, name: account.name, currency: account.currency, net };
  });

  const vendorRetention = retentions.filter((r) => r.direction === "COMPANY_FROM_VENDOR");
  const clientRetention = retentions.filter((r) => r.direction === "CLIENT_FROM_COMPANY");

  const advanceRows = advancePayments
    .map((p) => ({
      id: p.id,
      type: p.type,
      party: p.vendor?.name ?? p.client?.name ?? "—",
      currency: p.currency,
      remaining: Number(p.originalAmount ?? p.amount) - sumDecimal(p.allocations),
    }))
    .filter((row) => row.remaining > 0.005);

  const vendorAdvances = advanceRows.filter((r) => r.type === "VENDOR_ADVANCE");
  const clientAdvances = advanceRows.filter((r) => r.type === "CLIENT_ADVANCE");

  const upcomingPayments = payablesRows
    .filter((r) => !r.overdue && r.dueDate <= upcomingCutoff)
    .slice(0, 10);

  const overdueInvoices = [
    ...payablesRows.filter((r) => r.overdue).map((r) => ({ ...r, kind: "Payable" as const })),
    ...receivablesRows.filter((r) => r.overdue).map((r) => ({ ...r, kind: "Receivable" as const })),
  ]
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 8);

  const projectStatusCounts = PROJECT_STATUSES.map((status) => ({
    status,
    count: projectCounts.find((c) => c.status === status)?._count._all ?? 0,
  }));
  const contractStatusCounts = CONTRACT_STATUSES.map((status) => ({
    status,
    count: contractCounts.find((c) => c.status === status)?._count._all ?? 0,
  }));

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Company-wide cash position, AR/AP aging, and job status at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Outstanding Payables"
          value={formatMultiCurrency([
            ...payablesRows.map((r) => ({ amount: r.remaining, currency: r.currency })),
            ...vendorOpeningBalanceRows,
          ])}
          hint={`${payablesRows.length} open invoice${payablesRows.length === 1 ? "" : "s"}${vendorOpeningBalanceRows.length > 0 ? " + opening balances" : ""}`}
          href="/reports"
        />
        <KpiCard
          label="Outstanding Receivables"
          value={formatMultiCurrency([
            ...receivablesRows.map((r) => ({ amount: r.remaining, currency: r.currency })),
            ...clientOpeningBalanceRows,
          ])}
          hint={`${receivablesRows.length} open invoice${receivablesRows.length === 1 ? "" : "s"}${clientOpeningBalanceRows.length > 0 ? " + opening balances" : ""}`}
          href="/reports"
        />
        <KpiCard
          label="Cash Position"
          value={formatMultiCurrency(cashRows.map((r) => ({ amount: r.net, currency: r.currency })))}
          hint={`${cashRows.length} bank account${cashRows.length === 1 ? "" : "s"}`}
          href="/bank-accounts"
        />
        <KpiCard
          label="Overdue Invoices"
          value={String(payablesOverdueCount + receivablesOverdueCount)}
          hint={`${payablesOverdueCount} payable · ${receivablesOverdueCount} receivable`}
          tone={payablesOverdueCount + receivablesOverdueCount > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Retention Held</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MiniStat
              label="Held from Vendors"
              value={formatMultiCurrency(vendorRetention.map((r) => ({ amount: Number(r.amount), currency: r.currency })))}
              hint={`${vendorRetention.length} record${vendorRetention.length === 1 ? "" : "s"}`}
            />
            <MiniStat
              label="Held by Client"
              value={formatMultiCurrency(clientRetention.map((r) => ({ amount: Number(r.amount), currency: r.currency })))}
              hint={`${clientRetention.length} record${clientRetention.length === 1 ? "" : "s"}`}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Advances Outstanding</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MiniStat
              label="Paid to Vendors"
              value={formatMultiCurrency(vendorAdvances.map((r) => ({ amount: r.remaining, currency: r.currency })))}
              hint={`${vendorAdvances.length} unconsumed`}
            />
            <MiniStat
              label="Received from Clients"
              value={formatMultiCurrency(clientAdvances.map((r) => ({ amount: r.remaining, currency: r.currency })))}
              hint={`${clientAdvances.length} unconsumed`}
            />
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Bank Balances</h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Opening balance plus the net of all recorded Treasury payments (incoming minus
          outgoing).
        </p>
        {cashRows.length === 0 ? (
          <EmptyRow />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cashRows.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{row.name}</div>
                <div
                  className={`mt-1 text-lg font-semibold ${row.net < 0 ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}
                >
                  {formatMoney(row.net, row.currency)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Upcoming Payments (next {UPCOMING_WINDOW_DAYS} days)
          </h2>
          {upcomingPayments.length === 0 ? (
            <EmptyRow />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {upcomingPayments.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                        <Link href={`/purchase-invoices/${row.id}`} className="hover:underline">
                          {row.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.party}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {formatMoney(row.remaining, row.currency)}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {row.dueDate.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Late Payments</h2>
          {overdueInvoices.length === 0 ? (
            <EmptyRow />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Days Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {overdueInvoices.map((row) => {
                    const daysLate = Math.floor((now.getTime() - row.dueDate.getTime()) / 86_400_000);
                    return (
                      <tr key={`${row.kind}-${row.id}`}>
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{row.number}</td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{row.kind}</td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {formatMoney(row.remaining, row.currency)}
                        </td>
                        <td className="px-4 py-3 font-medium text-red-600 dark:text-red-400">{daysLate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusBreakdown title="Project Status" counts={projectStatusCounts} />
        <StatusBreakdown title="Contract Status" counts={contractStatusCounts} />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
  tone?: "default" | "warning";
}) {
  const content = (
    <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
      <div
        className={`mt-1 text-xl font-semibold ${tone === "warning" ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-50"}`}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</div>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block transition hover:opacity-80">
      {content}
    </Link>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
      <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</div>
    </div>
  );
}

function StatusBreakdown({
  title,
  counts,
}: {
  title: string;
  counts: { status: string; count: number }[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      <div className="flex flex-wrap gap-3">
        {counts.map((row) => (
          <div
            key={row.status}
            className="flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <span className="text-zinc-500 dark:text-zinc-400">{row.status.replace("_", " ")}</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">{row.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyRow() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
      Nothing to show yet.
    </div>
  );
}

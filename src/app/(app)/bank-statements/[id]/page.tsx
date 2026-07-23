import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReconcileControls } from "../ReconcileControls";

function formatMoney(value: unknown) {
  return Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function BankStatementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const statement = await prisma.bankStatement.findUnique({
    where: { id },
    include: {
      bankAccount: true,
      transactions: {
        orderBy: { date: "asc" },
        include: {
          payment: { include: { vendor: true, client: true } },
        },
      },
    },
  });

  if (!statement) {
    notFound();
  }

  const unmatchedPayments = await prisma.payment.findMany({
    where: { bankAccountId: statement.bankAccountId, bankTransactionId: null },
    include: { vendor: true, client: true },
    orderBy: { date: "desc" },
  });

  const openInvoices = await prisma.purchaseInvoice.findMany({
    where: {
      status: { in: ["READY_FOR_PAYMENT", "PARTIALLY_PAID"] },
      currency: statement.bankAccount.currency,
    },
    include: { vendor: true, allocations: true },
    orderBy: { dueDate: "asc" },
  });

  const reconciledCount = statement.transactions.filter((t) => t.reconciled).length;

  const transactionRows = statement.transactions.map((t) => ({
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    description: t.description,
    amount: Number(t.amount),
    currency: statement.bankAccount.currency,
    reconciled: t.reconciled,
    linkedPaymentLabel: t.payment
      ? `${t.payment.vendor?.name ?? t.payment.client?.name ?? t.payment.type} — ${formatMoney(t.payment.amount)} ${t.payment.currency}`
      : null,
  }));

  const candidatePayments = unmatchedPayments.map((p) => ({
    id: p.id,
    direction: p.direction as "IN" | "OUT",
    label: `${p.vendor?.name ?? p.client?.name ?? p.type} — ${formatMoney(p.amount)} ${p.currency} (${p.date.toISOString().slice(0, 10)})`,
  }));

  const openInvoiceOptions = openInvoices.map((inv) => {
    const remaining = Number(inv.amount) - inv.allocations.reduce((a, x) => a + Number(x.amount), 0);
    return {
      id: inv.id,
      label: `${inv.number} — ${inv.vendor.name} (${formatMoney(remaining)} ${inv.currency} remaining)`,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {statement.fileName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {statement.bankAccount.name} · {statement.periodStart?.toISOString().slice(0, 10) ?? "—"}{" "}
            – {statement.periodEnd?.toISOString().slice(0, 10) ?? "—"} · {reconciledCount} /{" "}
            {statement.transactions.length} reconciled
          </p>
        </div>
        <Link
          href={`/bank-statements/${statement.id}/edit`}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Edit
        </Link>
      </div>

      <ReconcileControls
        statementId={statement.id}
        transactions={transactionRows}
        candidatePayments={candidatePayments}
        openInvoices={openInvoiceOptions}
      />
    </div>
  );
}

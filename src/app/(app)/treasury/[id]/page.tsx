import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AllocationForm } from "../AllocationForm";

const OPEN_PURCHASE_STATUSES = ["READY_FOR_PAYMENT", "PARTIALLY_PAID"] as const;
const OPEN_SALES_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"] as const;

function formatMoney(value: unknown, currency: string) {
  return `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function describePayment(type: string, direction: string) {
  if (type === "VENDOR_ADVANCE") return "Advance to Vendor";
  if (type === "CLIENT_ADVANCE") return "Advance from Client";
  if (type === "RETENTION_RELEASE") return "Retention Release";
  return direction === "OUT" ? "Vendor Invoice Settlement" : "Client Invoice Settlement";
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      bankAccount: true,
      vendor: true,
      client: true,
      allocations: {
        include: { purchaseInvoice: true, salesInvoice: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!payment) {
    notFound();
  }

  const allocatedTotal = payment.allocations.reduce((acc, a) => acc + Number(a.amount), 0);
  const remaining = Number(payment.amount) - allocatedTotal;

  let eligibleInvoices: { id: string; number: string; amount: number; remaining: number; currency: string }[] =
    [];
  if (remaining > 0.001) {
    if (payment.direction === "OUT") {
      const invoices = await prisma.purchaseInvoice.findMany({
        where: { status: { in: [...OPEN_PURCHASE_STATUSES] }, currency: payment.currency },
        include: { allocations: true },
      });
      eligibleInvoices = invoices
        .map((inv) => ({
          id: inv.id,
          number: inv.number,
          currency: inv.currency,
          amount: Number(inv.amount),
          remaining: Number(inv.amount) - inv.allocations.reduce((a, x) => a + Number(x.amount), 0),
        }))
        .filter((inv) => inv.remaining > 0.001);
    } else {
      const invoices = await prisma.salesInvoice.findMany({
        where: { status: { in: [...OPEN_SALES_STATUSES] }, currency: payment.currency },
        include: { allocations: true },
      });
      eligibleInvoices = invoices
        .map((inv) => ({
          id: inv.id,
          number: inv.number,
          currency: inv.currency,
          amount: Number(inv.amount),
          remaining: Number(inv.amount) - inv.allocations.reduce((a, x) => a + Number(x.amount), 0),
        }))
        .filter((inv) => inv.remaining > 0.001);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {describePayment(payment.type, payment.direction)}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {payment.direction === "OUT" ? "Outgoing" : "Incoming"} payment
          </p>
        </div>
        {payment.allocations.length === 0 && (
          <Link
            href={`/treasury/${payment.id}/edit`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Edit
          </Link>
        )}
      </div>

      <div className="grid max-w-2xl grid-cols-2 gap-x-8 gap-y-3 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <Detail label="Bank Account" value={payment.bankAccount.name} />
        <Detail label="Party" value={payment.vendor?.name ?? payment.client?.name ?? "—"} />
        <Detail label="Amount" value={formatMoney(payment.amount, payment.currency)} />
        <Detail label="Date" value={payment.date.toISOString().slice(0, 10)} />
        <Detail label="Allocated" value={formatMoney(allocatedTotal, payment.currency)} />
        <Detail label="Remaining" value={formatMoney(remaining, payment.currency)} />
        {payment.advancePercent && (
          <Detail label="Recoupment %" value={`${payment.advancePercent.toString()}%`} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Allocations</h2>
        {payment.allocations.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Not yet allocated to any invoice.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payment.allocations.map((allocation) => {
              const invoice = allocation.purchaseInvoice ?? allocation.salesInvoice;
              const href = allocation.purchaseInvoice
                ? `/purchase-invoices/${allocation.purchaseInvoice.id}`
                : `/sales-invoices/${allocation.salesInvoiceId}/edit`;
              return (
                <li
                  key={allocation.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                >
                  <Link href={href} className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                    {invoice?.number ?? "—"}
                  </Link>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatMoney(allocation.amount, payment.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {remaining > 0.001 && (
        <AllocationForm
          paymentId={payment.id}
          direction={payment.direction}
          invoices={eligibleInvoices}
          paymentRemaining={remaining}
          advancePercent={payment.advancePercent ? Number(payment.advancePercent) : null}
        />
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-zinc-400 dark:text-zinc-500">{label}</dt>
      <dd className="text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  );
}

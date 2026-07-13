import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { ApprovalActions } from "../ApprovalActions";

function formatMoney(value: unknown, currency: string) {
  return `${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "—";
}

export default async function PurchaseInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, currentUser] = await Promise.all([
    prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        project: true,
        contract: true,
        approvalSteps: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Purchase Invoice {invoice.number}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {invoice.status.replace(/_/g, " ")}
          </p>
        </div>
        {invoice.status === "RECEIVED" && (
          <Link
            href={`/purchase-invoices/${invoice.id}/edit`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          >
            Edit
          </Link>
        )}
      </div>

      <div className="grid max-w-2xl grid-cols-2 gap-x-8 gap-y-3 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <Detail label="Vendor" value={invoice.vendor.name} />
        <Detail label="Project" value={`${invoice.project.code} — ${invoice.project.name}`} />
        <Detail label="Contract" value={invoice.contract?.number ?? "—"} />
        <Detail label="SEF Number" value={invoice.sefNumber ?? "—"} />
        <Detail label="Amount" value={formatMoney(invoice.amount, invoice.currency)} />
        <Detail label="Issue Date" value={formatDate(invoice.issueDate)} />
        <Detail label="Due Date" value={formatDate(invoice.dueDate)} />
      </div>

      {currentUser && (
        <ApprovalActions invoiceId={invoice.id} status={invoice.status} userRole={currentUser.role} />
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Approval history
        </h2>
        {invoice.approvalSteps.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Not yet submitted for approval.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {invoice.approvalSteps.map((step) => (
              <li
                key={step.id}
                className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {step.role.replace(/_/g, " ")} — {step.decision}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {step.actedAt ? new Date(step.actedAt).toLocaleString() : ""}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  by {step.actor?.name ?? "—"}
                </p>
                {step.comment && (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">{step.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PurchaseInvoiceForm } from "../../PurchaseInvoiceForm";
import { updatePurchaseInvoice } from "../../actions";

export default async function EditPurchaseInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, vendors, projects, contracts] = await Promise.all([
    prisma.purchaseInvoice.findUnique({ where: { id } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.contract.findMany({
      orderBy: { number: "asc" },
      select: { id: true, number: true, projectId: true },
    }),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Purchase Invoice
      </h1>
      {invoice.status !== "RECEIVED" ? (
        <p className="max-w-lg rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          This invoice can no longer be edited once submitted for approval (current status:{" "}
          {invoice.status.replace(/_/g, " ")}).{" "}
          <Link href={`/purchase-invoices/${invoice.id}`} className="underline">
            View invoice
          </Link>
          .
        </p>
      ) : (
        <PurchaseInvoiceForm
          action={updatePurchaseInvoice.bind(null, id)}
          vendors={vendors}
          projects={projects}
          contracts={contracts}
          defaultValues={{
            number: invoice.number,
            sefNumber: invoice.sefNumber,
            vendorId: invoice.vendorId,
            projectId: invoice.projectId,
            contractId: invoice.contractId,
            amount: invoice.amount.toString(),
            currency: invoice.currency,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
          }}
        />
      )}
    </div>
  );
}

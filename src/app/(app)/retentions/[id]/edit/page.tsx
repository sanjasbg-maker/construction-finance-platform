import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RetentionForm } from "../../RetentionForm";
import { updateRetention } from "../../actions";
import { getRetentionFormOptions } from "../../form-options";

export default async function EditRetentionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [retention, { contracts, purchaseInvoices, salesInvoices }] = await Promise.all([
    prisma.retention.findUnique({ where: { id } }),
    getRetentionFormOptions(),
  ]);

  if (!retention) {
    notFound();
  }

  const linkedInvoiceId = retention.purchaseInvoiceId ?? retention.salesInvoiceId ?? "";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Retention</h1>
      <RetentionForm
        action={updateRetention.bind(null, id)}
        contracts={contracts}
        purchaseInvoices={purchaseInvoices}
        salesInvoices={salesInvoices}
        defaultValues={{
          contractId: retention.contractId,
          direction: retention.direction,
          linkedInvoiceId,
          amount: retention.amount.toString(),
          currency: retention.currency,
          percent: retention.percent?.toString() ?? "",
          status: retention.status,
          releaseDate: retention.releaseDate,
        }}
      />
    </div>
  );
}

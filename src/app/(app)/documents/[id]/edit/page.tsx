import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DocumentForm } from "../../DocumentForm";
import { updateDocument } from "../../actions";
import { getLinkOptions } from "../../link-options";
import type { LinkType } from "../../schema";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, linkOptions] = await Promise.all([
    prisma.document.findUnique({ where: { id } }),
    getLinkOptions(),
  ]);

  if (!document) {
    notFound();
  }

  const linkType: LinkType = document.projectId
    ? "PROJECT"
    : document.contractId
      ? "CONTRACT"
      : document.purchaseInvoiceId
        ? "PURCHASE_INVOICE"
        : document.salesInvoiceId
          ? "SALES_INVOICE"
          : document.bankStatementId
            ? "BANK_STATEMENT"
            : "NONE";
  const linkId =
    document.projectId ??
    document.contractId ??
    document.purchaseInvoiceId ??
    document.salesInvoiceId ??
    document.bankStatementId ??
    undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Document</h1>
      <DocumentForm
        action={updateDocument.bind(null, id)}
        requireFile={false}
        linkOptions={linkOptions}
        defaultValues={{
          category: document.category,
          linkType,
          linkId,
          fileName: document.fileName,
        }}
      />
    </div>
  );
}

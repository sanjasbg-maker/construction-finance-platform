import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/DeleteButton";
import { removeDocument } from "./actions";
import { CATEGORIES } from "./schema";

const CATEGORY_LABELS: Record<string, string> = {
  CONTRACT: "Contract",
  AMENDMENT: "Amendment",
  INVOICE: "Invoice",
  BANK_STATEMENT: "Bank Statement",
  GUARANTEE: "Guarantee",
  PHOTO: "Photo",
  CORRESPONDENCE: "Correspondence",
  OTHER: "Other",
};

async function getDocuments(category?: string) {
  return prisma.document.findMany({
    where: category ? { category: category as (typeof CATEGORIES)[number] } : undefined,
    include: {
      project: { select: { id: true, name: true, code: true } },
      contract: { select: { id: true, number: true } },
      purchaseInvoice: { select: { id: true, number: true } },
      salesInvoice: { select: { id: true, number: true } },
      bankStatement: { select: { id: true, fileName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

type DocumentRow = Awaited<ReturnType<typeof getDocuments>>[number];

function describeLink(doc: DocumentRow): { label: string; href: string | null } {
  if (doc.project) return { label: `Project ${doc.project.code}`, href: `/projects/${doc.project.id}/edit` };
  if (doc.contract) return { label: `Contract ${doc.contract.number}`, href: `/contracts/${doc.contract.id}/edit` };
  if (doc.purchaseInvoice)
    return { label: `Purchase Invoice ${doc.purchaseInvoice.number}`, href: `/purchase-invoices/${doc.purchaseInvoice.id}` };
  if (doc.salesInvoice)
    return { label: `Sales Invoice ${doc.salesInvoice.number}`, href: `/sales-invoices/${doc.salesInvoice.id}/edit` };
  if (doc.bankStatement)
    return { label: `Bank Statement ${doc.bankStatement.fileName}`, href: `/bank-statements/${doc.bankStatement.id}` };
  return { label: "Not linked", href: null };
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const validCategory = category && (CATEGORIES as readonly string[]).includes(category) ? category : undefined;
  const documents = await getDocuments(validCategory);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Documents</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Contracts, invoices, bank statements, guarantees, photos, and correspondence.
          </p>
        </div>
        <Link
          href="/documents/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Upload Document
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <CategoryFilterLink label="All" active={!validCategory} href="/documents" />
        {CATEGORIES.map((c) => (
          <CategoryFilterLink
            key={c}
            label={CATEGORY_LABELS[c]}
            active={validCategory === c}
            href={`/documents?category=${c}`}
          />
        ))}
      </div>

      {documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No documents{validCategory ? " in this category" : ""} yet.{" "}
          <Link href="/documents/new" className="underline">
            Upload the first one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Linked To</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {documents.map((doc) => {
                const link = describeLink(doc);
                return (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      <a
                        href={`/api/documents/${doc.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {doc.fileName}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {CATEGORY_LABELS[doc.category] ?? doc.category}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {link.href ? (
                        <Link href={link.href} className="hover:underline">
                          {link.label}
                        </Link>
                      ) : (
                        link.label
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {doc.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/documents/${doc.id}/edit`}
                          className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                        >
                          Edit
                        </Link>
                        <DeleteButton
                          action={removeDocument.bind(null, doc.id)}
                          confirmMessage={`Delete "${doc.fileName}"? This can't be undone from the UI yet.`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CategoryFilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
      }`}
    >
      {label}
    </Link>
  );
}

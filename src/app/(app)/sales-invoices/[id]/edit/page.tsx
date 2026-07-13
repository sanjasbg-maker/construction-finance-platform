import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SalesInvoiceForm } from "../../SalesInvoiceForm";
import { updateSalesInvoice } from "../../actions";

export default async function EditSalesInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, clients, projects, contracts, situations] = await Promise.all([
    prisma.salesInvoice.findUnique({ where: { id } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.contract.findMany({
      orderBy: { number: "asc" },
      select: { id: true, number: true, projectId: true },
    }),
    prisma.situation.findMany({
      where: { status: "APPROVED" },
      orderBy: { number: "asc" },
      select: { id: true, number: true },
    }),
  ]);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Sales Invoice
      </h1>
      <SalesInvoiceForm
        action={updateSalesInvoice.bind(null, id)}
        clients={clients}
        projects={projects}
        contracts={contracts}
        situations={situations}
        defaultValues={{
          number: invoice.number,
          clientId: invoice.clientId,
          projectId: invoice.projectId,
          contractId: invoice.contractId,
          situationId: invoice.situationId,
          amount: invoice.amount.toString(),
          currency: invoice.currency,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          status: invoice.status,
        }}
      />
    </div>
  );
}

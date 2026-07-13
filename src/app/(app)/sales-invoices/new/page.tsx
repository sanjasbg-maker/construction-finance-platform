import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SalesInvoiceForm } from "../SalesInvoiceForm";
import { createSalesInvoice } from "../actions";

export default async function NewSalesInvoicePage() {
  const [clients, projects, contracts, situations] = await Promise.all([
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

  const missing: string[] = [];
  if (clients.length === 0) missing.push("client");
  if (projects.length === 0) missing.push("project");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add Sales Invoice
      </h1>
      {missing.length > 0 ? (
        <p className="max-w-lg rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          A sales invoice needs a {missing.join(" and a ")}. Please add{" "}
          {missing.includes("client") && (
            <Link href="/clients/new" className="underline">
              a client
            </Link>
          )}
          {missing.includes("client") && missing.includes("project") && " and "}
          {missing.includes("project") && (
            <Link href="/projects/new" className="underline">
              a project
            </Link>
          )}{" "}
          first.
        </p>
      ) : (
        <SalesInvoiceForm
          action={createSalesInvoice}
          clients={clients}
          projects={projects}
          contracts={contracts}
          situations={situations}
        />
      )}
    </div>
  );
}

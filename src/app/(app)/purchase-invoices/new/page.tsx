import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PurchaseInvoiceForm } from "../PurchaseInvoiceForm";
import { createPurchaseInvoice } from "../actions";

export default async function NewPurchaseInvoicePage() {
  const [vendors, projects, contracts] = await Promise.all([
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

  const missing: string[] = [];
  if (vendors.length === 0) missing.push("vendor");
  if (projects.length === 0) missing.push("project");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add Purchase Invoice
      </h1>
      {missing.length > 0 ? (
        <p className="max-w-lg rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          A purchase invoice needs a {missing.join(" and a ")}. Please add{" "}
          {missing.includes("vendor") && (
            <Link href="/vendors/new" className="underline">
              a vendor
            </Link>
          )}
          {missing.includes("vendor") && missing.includes("project") && " and "}
          {missing.includes("project") && (
            <Link href="/projects/new" className="underline">
              a project
            </Link>
          )}{" "}
          first.
        </p>
      ) : (
        <PurchaseInvoiceForm
          action={createPurchaseInvoice}
          vendors={vendors}
          projects={projects}
          contracts={contracts}
        />
      )}
    </div>
  );
}

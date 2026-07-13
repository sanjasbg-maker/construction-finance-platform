import { prisma } from "@/lib/prisma";
import type { LinkType } from "./schema";

export type LinkOption = { type: LinkType; id: string; label: string };

export async function getLinkOptions(): Promise<LinkOption[]> {
  const [projects, contracts, purchaseInvoices, salesInvoices, bankStatements] = await Promise.all([
    prisma.project.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.contract.findMany({
      select: { id: true, number: true, project: { select: { code: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.purchaseInvoice.findMany({
      select: { id: true, number: true, vendor: { select: { name: true } } },
      orderBy: { issueDate: "desc" },
    }),
    prisma.salesInvoice.findMany({
      select: { id: true, number: true, client: { select: { name: true } } },
      orderBy: { issueDate: "desc" },
    }),
    prisma.bankStatement.findMany({
      select: { id: true, fileName: true, bankAccount: { select: { name: true } } },
      orderBy: { importedAt: "desc" },
    }),
  ]);

  return [
    ...projects.map((p) => ({ type: "PROJECT" as const, id: p.id, label: `${p.code} — ${p.name}` })),
    ...contracts.map((c) => ({
      type: "CONTRACT" as const,
      id: c.id,
      label: `${c.number} (${c.project.code})`,
    })),
    ...purchaseInvoices.map((i) => ({
      type: "PURCHASE_INVOICE" as const,
      id: i.id,
      label: `${i.number} — ${i.vendor.name}`,
    })),
    ...salesInvoices.map((i) => ({
      type: "SALES_INVOICE" as const,
      id: i.id,
      label: `${i.number} — ${i.client.name}`,
    })),
    ...bankStatements.map((s) => ({
      type: "BANK_STATEMENT" as const,
      id: s.id,
      label: `${s.fileName} (${s.bankAccount.name})`,
    })),
  ];
}

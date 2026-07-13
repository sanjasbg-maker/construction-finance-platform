import { prisma } from "@/lib/prisma";

export async function getRetentionFormOptions() {
  const [contracts, purchaseInvoices, salesInvoices] = await Promise.all([
    prisma.contract.findMany({
      include: { project: true },
      orderBy: { date: "desc" },
    }),
    prisma.purchaseInvoice.findMany({
      where: { contractId: { not: null } },
      include: { vendor: true },
      orderBy: { issueDate: "desc" },
    }),
    prisma.salesInvoice.findMany({
      where: { contractId: { not: null } },
      include: { client: true },
      orderBy: { issueDate: "desc" },
    }),
  ]);

  return {
    contracts: contracts.map((c) => ({ id: c.id, number: c.number, projectCode: c.project.code })),
    purchaseInvoices: purchaseInvoices.map((i) => ({
      id: i.id,
      number: i.number,
      contractId: i.contractId as string,
      party: i.vendor.name,
    })),
    salesInvoices: salesInvoices.map((i) => ({
      id: i.id,
      number: i.number,
      contractId: i.contractId as string,
      party: i.client.name,
    })),
  };
}

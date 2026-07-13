import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { sumDecimal } from "@/lib/money";

// Same "still owed" status set used by Reports/Dashboard's Outstanding
// Payables - paid/cancelled invoices don't belong in an aging export.
const OUTSTANDING_PURCHASE_STATUSES = [
  "RECEIVED",
  "WAITING_PM_APPROVAL",
  "APPROVED",
  "WAITING_DIRECTOR_APPROVAL",
  "READY_FOR_PAYMENT",
  "PARTIALLY_PAID",
] as const;

function agingBucket(daysOverdue: number) {
  if (daysOverdue <= 0) return "Not yet due";
  if (daysOverdue <= 30) return "1-30 days";
  if (daysOverdue <= 60) return "31-60 days";
  if (daysOverdue <= 90) return "61-90 days";
  return "90+ days";
}

export async function GET() {
  const now = new Date();

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { status: { in: [...OUTSTANDING_PURCHASE_STATUSES] } },
    include: { vendor: true, project: true, allocations: true },
    orderBy: { dueDate: "asc" },
  });

  const rows = invoices.map((invoice) => {
    const remaining = Number(invoice.amount) - sumDecimal(invoice.allocations);
    const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86_400_000);
    return {
      "Invoice Number": invoice.number,
      Vendor: invoice.vendor.name,
      Project: invoice.project.code,
      Amount: Number(invoice.amount).toFixed(2),
      Remaining: remaining.toFixed(2),
      Currency: invoice.currency,
      "Issue Date": invoice.issueDate.toISOString().slice(0, 10),
      "Due Date": invoice.dueDate.toISOString().slice(0, 10),
      "Days Overdue": Math.max(0, daysOverdue),
      Aging: agingBucket(daysOverdue),
      Status: invoice.status.replace(/_/g, " "),
    };
  });

  const csv = Papa.unparse(rows);
  const fileName = `purchase-invoices-aging-${now.toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}

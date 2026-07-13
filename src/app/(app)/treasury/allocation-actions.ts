"use server";

import { revalidatePath } from "next/cache";
import { prisma, withUser } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/authorization";

export type AllocationActionResult = { success: true } | { success: false; error: string };

const OPEN_PURCHASE_STATUSES = new Set(["READY_FOR_PAYMENT", "PARTIALLY_PAID"]);
const OPEN_SALES_STATUSES = new Set(["SENT", "PARTIALLY_PAID", "OVERDUE"]);

function sumAllocated(allocations: { amount: unknown }[]) {
  return allocations.reduce((acc, a) => acc + Number(a.amount), 0);
}

function nextInvoiceStatus(invoiceAmount: unknown, allocatedSoFar: number, addedAmount: number) {
  const total = allocatedSoFar + addedAmount;
  return total >= Number(invoiceAmount) - 0.001 ? "PAID" : "PARTIALLY_PAID";
}

/**
 * Shared by both invoice types: creates the PaymentAllocation and updates the
 * target invoice's status in one transaction. `invoiceModel` picks the Prisma
 * delegate (purchaseInvoice/salesInvoice) dynamically so this logic isn't
 * duplicated per invoice type - see plan's "one allocation mechanism" decision.
 */
async function writeAllocation({
  userId,
  paymentId,
  amount,
  invoiceModel,
  invoiceIdField,
  invoiceId,
  nextStatus,
}: {
  userId: string;
  paymentId: string;
  amount: string;
  invoiceModel: "purchaseInvoice" | "salesInvoice";
  invoiceIdField: "purchaseInvoiceId" | "salesInvoiceId";
  invoiceId: string;
  nextStatus: string;
}) {
  const client = withUser(userId);
  await client.$transaction(async (tx) => {
    await tx.paymentAllocation.create({
      data: { paymentId, amount, [invoiceIdField]: invoiceId },
    });
    await (
      tx as unknown as Record<string, { update: (a: unknown) => Promise<unknown> }>
    )[invoiceModel].update({
      where: { id: invoiceId },
      data: { status: nextStatus },
    });
  });
}

export async function addAllocation({
  paymentId,
  purchaseInvoiceId,
  salesInvoiceId,
  amount,
}: {
  paymentId: string;
  purchaseInvoiceId?: string;
  salesInvoiceId?: string;
  amount: string;
}): Promise<AllocationActionResult> {
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { success: false, error: error ?? "Unauthorized" };

  const amountNum = Number(amount);
  if (Number.isNaN(amountNum) || amountNum <= 0) {
    return { success: false, error: "Amount must be a positive number." };
  }
  if (!purchaseInvoiceId && !salesInvoiceId) {
    return { success: false, error: "Select an invoice to allocate to." };
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { allocations: true },
  });
  if (!payment) return { success: false, error: "Payment not found." };

  const paymentRemaining = Number(payment.amount) - sumAllocated(payment.allocations);
  if (amountNum > paymentRemaining + 0.001) {
    return {
      success: false,
      error: `Amount exceeds the payment's remaining balance (${paymentRemaining.toFixed(2)} ${payment.currency}).`,
    };
  }

  if (purchaseInvoiceId) {
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id: purchaseInvoiceId },
      include: { allocations: true },
    });
    if (!invoice) return { success: false, error: "Invoice not found." };
    if (!OPEN_PURCHASE_STATUSES.has(invoice.status)) {
      return { success: false, error: `Invoice is not open for payment (status: ${invoice.status}).` };
    }
    if (invoice.currency !== payment.currency) {
      return { success: false, error: "Invoice currency does not match payment currency." };
    }
    const allocatedSoFar = sumAllocated(invoice.allocations);
    const remaining = Number(invoice.amount) - allocatedSoFar;
    if (amountNum > remaining + 0.001) {
      return {
        success: false,
        error: `Amount exceeds the invoice's remaining balance (${remaining.toFixed(2)} ${invoice.currency}).`,
      };
    }

    await writeAllocation({
      userId: user.id,
      paymentId,
      amount,
      invoiceModel: "purchaseInvoice",
      invoiceIdField: "purchaseInvoiceId",
      invoiceId: purchaseInvoiceId,
      nextStatus: nextInvoiceStatus(invoice.amount, allocatedSoFar, amountNum),
    });
    revalidatePath("/purchase-invoices");
    revalidatePath(`/purchase-invoices/${purchaseInvoiceId}`);
  } else if (salesInvoiceId) {
    const invoice = await prisma.salesInvoice.findUnique({
      where: { id: salesInvoiceId },
      include: { allocations: true },
    });
    if (!invoice) return { success: false, error: "Invoice not found." };
    if (!OPEN_SALES_STATUSES.has(invoice.status)) {
      return { success: false, error: `Invoice is not open for payment (status: ${invoice.status}).` };
    }
    if (invoice.currency !== payment.currency) {
      return { success: false, error: "Invoice currency does not match payment currency." };
    }
    const allocatedSoFar = sumAllocated(invoice.allocations);
    const remaining = Number(invoice.amount) - allocatedSoFar;
    if (amountNum > remaining + 0.001) {
      return {
        success: false,
        error: `Amount exceeds the invoice's remaining balance (${remaining.toFixed(2)} ${invoice.currency}).`,
      };
    }

    await writeAllocation({
      userId: user.id,
      paymentId,
      amount,
      invoiceModel: "salesInvoice",
      invoiceIdField: "salesInvoiceId",
      invoiceId: salesInvoiceId,
      nextStatus: nextInvoiceStatus(invoice.amount, allocatedSoFar, amountNum),
    });
    revalidatePath("/sales-invoices");
  }

  revalidatePath("/treasury");
  revalidatePath(`/treasury/${paymentId}`);
  return { success: true };
}

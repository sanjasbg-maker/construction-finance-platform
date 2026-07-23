"use server";

import { revalidatePath } from "next/cache";
import { prisma, withUser } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/authorization";

export type ReconcileResult = { success: true } | { success: false; error: string };
export type AutoReconcileResult =
  | { success: true; matched: number }
  | { success: false; error: string };
export type SettleResult =
  | { success: true; paymentId: string }
  | { success: false; error: string };

// Same eligibility set Treasury's allocation-actions.ts uses for "open for payment".
const OPEN_PURCHASE_STATUSES = new Set(["READY_FOR_PAYMENT", "PARTIALLY_PAID"]);

async function linkTransactionToPayment(userId: string, transactionId: string, paymentId: string) {
  const client = withUser(userId);
  await client.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: paymentId }, data: { bankTransactionId: transactionId } });
    await tx.bankTransaction.update({ where: { id: transactionId }, data: { reconciled: true } });
  });
}

export async function reconcileTransaction(
  transactionId: string,
  paymentId: string,
): Promise<ReconcileResult> {
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { success: false, error: error ?? "Unauthorized" };

  const transaction = await prisma.bankTransaction.findUnique({ where: { id: transactionId } });
  if (!transaction) return { success: false, error: "Transaction not found." };
  if (transaction.reconciled) return { success: false, error: "Transaction is already reconciled." };

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { success: false, error: "Payment not found." };
  if (payment.bankTransactionId) {
    return { success: false, error: "Payment is already linked to another transaction." };
  }

  await linkTransactionToPayment(user.id, transactionId, paymentId);
  revalidatePath("/bank-statements");
  revalidatePath(`/bank-statements/${transaction.bankStatementId}`);
  revalidatePath("/treasury");
  return { success: true };
}

/**
 * Exact-match automatic reconciliation (plan decision #4): for each
 * unreconciled transaction, link it only when there's exactly one candidate
 * unmatched Payment on the same bank account with the same amount and
 * implied direction. Ambiguous (multiple candidates) or unmatched
 * transactions are left for manual reconciliation - no guessing.
 */
export async function autoReconcileStatement(statementId: string): Promise<AutoReconcileResult> {
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { success: false, error: error ?? "Unauthorized" };

  const statement = await prisma.bankStatement.findUnique({
    where: { id: statementId },
    include: { transactions: { where: { reconciled: false } } },
  });
  if (!statement) return { success: false, error: "Statement not found." };

  const unmatchedPayments = await prisma.payment.findMany({
    where: { bankAccountId: statement.bankAccountId, bankTransactionId: null },
  });

  let matched = 0;
  for (const transaction of statement.transactions) {
    const amount = Number(transaction.amount);
    const direction = amount >= 0 ? "IN" : "OUT";
    const absAmount = Math.abs(amount);

    const candidates = unmatchedPayments.filter(
      (p) => p.direction === direction && Math.abs(Number(p.amount) - absAmount) < 0.005,
    );

    if (candidates.length === 1) {
      await linkTransactionToPayment(user.id, transaction.id, candidates[0].id);
      const idx = unmatchedPayments.findIndex((p) => p.id === candidates[0].id);
      if (idx >= 0) unmatchedPayments.splice(idx, 1);
      matched++;
    }
  }

  revalidatePath("/bank-statements");
  revalidatePath(`/bank-statements/${statementId}`);
  revalidatePath("/treasury");
  return { success: true, matched };
}

/**
 * Closes an open Purchase Invoice (typically received via SEF) directly from
 * an unreconciled bank transaction, instead of requiring a Payment to be
 * created in Treasury first. Creates the Payment pre-linked to the
 * transaction (bankTransactionId set immediately, no separate reconcile
 * step), allocates as much of the transaction as the invoice needs, and
 * updates the invoice's status - same allocation/status logic as Treasury's
 * addAllocation, just triggered from the bank statement side.
 *
 * If the transaction is larger than this one invoice's remaining balance
 * (one payment settling multiple invoices), the leftover stays unallocated
 * on the new Payment - visible and allocatable from its Treasury detail page
 * via the existing AllocationForm, same as any other payment.
 */
export async function settleInvoiceFromTransaction(
  transactionId: string,
  purchaseInvoiceId: string,
): Promise<SettleResult> {
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { success: false, error: error ?? "Unauthorized" };

  const transaction = await prisma.bankTransaction.findUnique({
    where: { id: transactionId },
    include: { bankStatement: { include: { bankAccount: true } } },
  });
  if (!transaction) return { success: false, error: "Transaction not found." };
  if (transaction.reconciled) {
    return { success: false, error: "Transaction is already reconciled." };
  }

  const rawAmount = Number(transaction.amount);
  if (rawAmount >= 0) {
    return { success: false, error: "This transaction is money coming in, not a vendor payment." };
  }

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id: purchaseInvoiceId },
    include: { allocations: true },
  });
  if (!invoice) return { success: false, error: "Invoice not found." };
  if (!OPEN_PURCHASE_STATUSES.has(invoice.status)) {
    return { success: false, error: `Invoice is not open for payment (status: ${invoice.status}).` };
  }

  const bankAccount = transaction.bankStatement.bankAccount;
  if (invoice.currency !== bankAccount.currency) {
    return { success: false, error: "Invoice currency does not match the bank account's currency." };
  }

  const transactionAmount = Math.abs(rawAmount);
  const allocatedSoFar = invoice.allocations.reduce((acc, a) => acc + Number(a.amount), 0);
  const invoiceRemaining = Number(invoice.amount) - allocatedSoFar;
  if (invoiceRemaining <= 0.001) {
    return { success: false, error: "This invoice has no remaining balance." };
  }
  const allocationAmount = Math.min(transactionAmount, invoiceRemaining);
  const nextStatus =
    allocatedSoFar + allocationAmount >= Number(invoice.amount) - 0.001 ? "PAID" : "PARTIALLY_PAID";

  const client = withUser(user.id);
  const payment = await client.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        direction: "OUT",
        type: "INVOICE_SETTLEMENT",
        amount: transactionAmount.toFixed(2),
        currency: bankAccount.currency,
        date: transaction.date,
        bankAccountId: bankAccount.id,
        vendorId: invoice.vendorId,
        bankTransactionId: transaction.id,
      },
    });
    await tx.paymentAllocation.create({
      data: {
        paymentId: created.id,
        purchaseInvoiceId: invoice.id,
        amount: allocationAmount.toFixed(2),
      },
    });
    await tx.purchaseInvoice.update({ where: { id: invoice.id }, data: { status: nextStatus } });
    await tx.bankTransaction.update({ where: { id: transaction.id }, data: { reconciled: true } });
    return created;
  });

  revalidatePath("/bank-statements");
  revalidatePath(`/bank-statements/${transaction.bankStatementId}`);
  revalidatePath("/purchase-invoices");
  revalidatePath(`/purchase-invoices/${invoice.id}`);
  revalidatePath("/treasury");
  return { success: true, paymentId: payment.id };
}

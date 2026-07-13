"use server";

import { revalidatePath } from "next/cache";
import { prisma, withUser } from "@/lib/prisma";
import { requireWriteAccess } from "@/lib/authorization";

export type ReconcileResult = { success: true } | { success: false; error: string };
export type AutoReconcileResult =
  | { success: true; matched: number }
  | { success: false; error: string };

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

"use server";

import { revalidatePath } from "next/cache";
import { prisma, withUser } from "@/lib/prisma";
import { requireWriteAccess, requireRole } from "@/lib/authorization";
import { getCurrentPm } from "@/lib/project-manager";
import type {
  ApprovalStepRole,
  ApprovalDecision,
  PurchaseInvoiceStatus,
} from "@/generated/prisma/client";

export type ApprovalActionResult = { success: true } | { success: false; error: string };

/**
 * Shared by every approval step: creates the ApprovalStep row and advances
 * (or cancels) the invoice's status in one transaction, so a partial failure
 * can never record a decision without moving the workflow forward - see plan
 * decisions #1/#2.
 */
async function recordApprovalDecision({
  purchaseInvoiceId,
  userId,
  role,
  decision,
  comment,
  expectedStatus,
  nextStatusIfApproved,
}: {
  purchaseInvoiceId: string;
  userId: string;
  role: ApprovalStepRole;
  decision: ApprovalDecision;
  comment?: string;
  expectedStatus: PurchaseInvoiceStatus;
  nextStatusIfApproved: PurchaseInvoiceStatus;
}): Promise<ApprovalActionResult> {
  const invoice = await prisma.purchaseInvoice.findUnique({ where: { id: purchaseInvoiceId } });
  if (!invoice) {
    return { success: false, error: "Invoice not found." };
  }
  if (invoice.status !== expectedStatus) {
    return {
      success: false,
      error: `This invoice is no longer waiting for this step (current status: ${invoice.status}).`,
    };
  }

  const nextStatus: PurchaseInvoiceStatus = decision === "APPROVED" ? nextStatusIfApproved : "CANCELLED";

  const client = withUser(userId);
  await client.$transaction(async (tx) => {
    await tx.approvalStep.create({
      data: {
        purchaseInvoiceId,
        role,
        decision,
        actedBy: userId,
        comment: comment || null,
        actedAt: new Date(),
      },
    });
    await tx.purchaseInvoice.update({
      where: { id: purchaseInvoiceId },
      data: { status: nextStatus },
    });
  });

  revalidatePath("/purchase-invoices");
  revalidatePath(`/purchase-invoices/${purchaseInvoiceId}`);
  return { success: true };
}

export async function submitForApproval(id: string): Promise<ApprovalActionResult> {
  const { user, error } = await requireWriteAccess();
  if (error || !user) return { success: false, error: error ?? "Unauthorized" };

  const invoice = await prisma.purchaseInvoice.findUnique({ where: { id } });
  if (!invoice) return { success: false, error: "Invoice not found." };
  if (invoice.status !== "RECEIVED") {
    return { success: false, error: `Invoice is already ${invoice.status}, not RECEIVED.` };
  }

  await withUser(user.id).purchaseInvoice.update({
    where: { id },
    data: { status: "WAITING_PM_APPROVAL" },
  });
  revalidatePath("/purchase-invoices");
  revalidatePath(`/purchase-invoices/${id}`);
  return { success: true };
}

export async function recordPmDecision(
  id: string,
  decision: ApprovalDecision,
  comment?: string,
): Promise<ApprovalActionResult> {
  const { user, error } = await requireRole(["PROJECT_MANAGER"]);
  if (error || !user) return { success: false, error: error ?? "Unauthorized" };

  // ADMIN bypasses, same as requireRole does everywhere else. A regular
  // PROJECT_MANAGER may only act on invoices for projects they're currently
  // assigned to - being a PM at all isn't enough.
  if (user.role !== "ADMIN") {
    const invoice = await prisma.purchaseInvoice.findUnique({ where: { id } });
    if (!invoice) return { success: false, error: "Invoice not found." };

    const assignment = await getCurrentPm(invoice.projectId);
    if (!assignment || assignment.userId !== user.id) {
      return {
        success: false,
        error: "Only the Project Manager assigned to this project can approve its invoices.",
      };
    }
  }

  return recordApprovalDecision({
    purchaseInvoiceId: id,
    userId: user.id,
    role: "PROJECT_MANAGER",
    decision,
    comment,
    expectedStatus: "WAITING_PM_APPROVAL",
    nextStatusIfApproved: "APPROVED",
  });
}

export async function recordFinanceDecision(
  id: string,
  decision: ApprovalDecision,
  comment?: string,
): Promise<ApprovalActionResult> {
  const { user, error } = await requireRole(["FINANCE"]);
  if (error || !user) return { success: false, error: error ?? "Unauthorized" };

  return recordApprovalDecision({
    purchaseInvoiceId: id,
    userId: user.id,
    role: "FINANCE",
    decision,
    comment,
    expectedStatus: "APPROVED",
    nextStatusIfApproved: "WAITING_DIRECTOR_APPROVAL",
  });
}

export async function recordDirectorDecision(
  id: string,
  decision: ApprovalDecision,
  comment?: string,
): Promise<ApprovalActionResult> {
  const { user, error } = await requireRole(["DIRECTOR"]);
  if (error || !user) return { success: false, error: error ?? "Unauthorized" };

  return recordApprovalDecision({
    purchaseInvoiceId: id,
    userId: user.id,
    role: "DIRECTOR",
    decision,
    comment,
    expectedStatus: "WAITING_DIRECTOR_APPROVAL",
    nextStatusIfApproved: "READY_FOR_PAYMENT",
  });
}

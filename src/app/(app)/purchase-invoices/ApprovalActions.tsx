"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitForApproval,
  recordPmDecision,
  recordFinanceDecision,
  recordDirectorDecision,
  type ApprovalActionResult,
} from "./approval-actions";

type Props = {
  invoiceId: string;
  status: string;
  userRole: string;
  isAssignedPm: boolean;
};

export function ApprovalActions({ invoiceId, status, userRole, isAssignedPm }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  function run(action: () => Promise<ApprovalActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setComment("");
      router.refresh();
    });
  }

  const canAct =
    (status === "RECEIVED" && userRole !== "VIEWER") ||
    (status === "WAITING_PM_APPROVAL" &&
      (userRole === "ADMIN" || (userRole === "PROJECT_MANAGER" && isAssignedPm))) ||
    (status === "APPROVED" && (userRole === "FINANCE" || userRole === "ADMIN")) ||
    (status === "WAITING_DIRECTOR_APPROVAL" && (userRole === "DIRECTOR" || userRole === "ADMIN"));

  if (!canAct) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Action required
      </h2>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {status === "RECEIVED" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => submitForApproval(invoiceId))}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Submit for approval
        </button>
      )}

      {(status === "WAITING_PM_APPROVAL" ||
        status === "APPROVED" ||
        status === "WAITING_DIRECTOR_APPROVAL") && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Comment (optional, required for rejection)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => decisionFor(status, invoiceId, "APPROVED", comment))}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => decisionFor(status, invoiceId, "REJECTED", comment))}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function decisionFor(
  status: string,
  invoiceId: string,
  decision: "APPROVED" | "REJECTED",
  comment: string,
) {
  if (status === "WAITING_PM_APPROVAL") return recordPmDecision(invoiceId, decision, comment);
  if (status === "APPROVED") return recordFinanceDecision(invoiceId, decision, comment);
  return recordDirectorDecision(invoiceId, decision, comment);
}

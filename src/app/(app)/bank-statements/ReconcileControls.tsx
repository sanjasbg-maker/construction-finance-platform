"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reconcileTransaction, autoReconcileStatement } from "./reconcile-actions";

type PaymentOption = { id: string; label: string; direction: "IN" | "OUT" };

type TransactionRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  reconciled: boolean;
  linkedPaymentLabel: string | null;
};

export function ReconcileControls({
  statementId,
  transactions,
  candidatePayments,
}: {
  statementId: string;
  transactions: TransactionRow[];
  candidatePayments: PaymentOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});

  function runAuto() {
    setAutoMessage(null);
    startTransition(async () => {
      const result = await autoReconcileStatement(statementId);
      if (!result.success) {
        setAutoMessage(result.error);
        return;
      }
      setAutoMessage(
        `Matched ${result.matched} transaction${result.matched === 1 ? "" : "s"} automatically.`,
      );
      router.refresh();
    });
  }

  function runManual(transactionId: string) {
    const paymentId = selected[transactionId];
    if (!paymentId) return;
    setRowError((prev) => ({ ...prev, [transactionId]: "" }));
    startTransition(async () => {
      const result = await reconcileTransaction(transactionId, paymentId);
      if (!result.success) {
        setRowError((prev) => ({ ...prev, [transactionId]: result.error }));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={runAuto}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Reconcile automatically
        </button>
        {autoMessage && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{autoMessage}</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {transactions.map((t) => {
              const direction: "IN" | "OUT" = t.amount >= 0 ? "IN" : "OUT";
              const rowCandidates = candidatePayments.filter((p) => p.direction === direction);
              return (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.date}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{t.description}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {t.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {t.currency}
                  </td>
                  <td className="px-4 py-3">
                    {t.reconciled ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Reconciled{t.linkedPaymentLabel ? ` — ${t.linkedPaymentLabel}` : ""}
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Unreconciled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!t.reconciled && (
                      <div className="flex items-center gap-2">
                        <select
                          value={selected[t.id] ?? ""}
                          onChange={(e) =>
                            setSelected((prev) => ({ ...prev, [t.id]: e.target.value }))
                          }
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                        >
                          <option value="">Match to payment…</option>
                          {rowCandidates.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={isPending || !selected[t.id]}
                          onClick={() => runManual(t.id)}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                    {rowError[t.id] && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {rowError[t.id]}
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

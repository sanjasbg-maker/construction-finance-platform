"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addAllocation } from "./allocation-actions";

type InvoiceOption = { id: string; number: string; amount: number; remaining: number; currency: string };

function roundTo2(value: number) {
  return Math.round(value * 100) / 100;
}

export function AllocationForm({
  paymentId,
  direction,
  invoices,
  paymentRemaining,
  advancePercent,
}: {
  paymentId: string;
  direction: "IN" | "OUT";
  invoices: InvoiceOption[];
  paymentRemaining: number;
  advancePercent?: number | null;
}) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleInvoiceChange(id: string) {
    setInvoiceId(id);
    if (!advancePercent) return;
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return;
    const suggested = roundTo2(
      Math.min((advancePercent / 100) * invoice.amount, invoice.remaining, paymentRemaining),
    );
    setAmount(suggested > 0 ? String(suggested) : "");
  }

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-zinc-400 dark:text-zinc-500">
        No open {direction === "OUT" ? "purchase" : "sales"} invoices to allocate to right now.
      </p>
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addAllocation({
        paymentId,
        ...(direction === "OUT"
          ? { purchaseInvoiceId: invoiceId }
          : { salesInvoiceId: invoiceId }),
        amount,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setInvoiceId("");
      setAmount("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Allocate to an invoice
      </h2>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Invoice
        </label>
        <select
          value={invoiceId}
          onChange={(e) => handleInvoiceChange(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Select an invoice…</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.number} — {inv.remaining.toFixed(2)} {inv.currency} remaining
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Amount
        </label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {advancePercent && invoiceId && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Suggested from {advancePercent}% recoupment - edit if this invoice needs a different
            amount.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || !invoiceId || !amount}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isPending ? "Allocating…" : "Allocate"}
      </button>
    </form>
  );
}

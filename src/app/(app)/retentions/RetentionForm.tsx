"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { RetentionFormState } from "./actions";
import { directions, statuses, currencies } from "./schema";

const initialState: RetentionFormState = {};

type ContractOption = { id: string; number: string; projectCode: string };
type InvoiceOption = { id: string; number: string; contractId: string; party: string };

type DefaultValues = {
  contractId?: string;
  direction?: string;
  linkedInvoiceId?: string;
  amount?: string;
  currency?: string;
  percent?: string | null;
  status?: string;
  releaseDate?: Date | string | null;
};

const DIRECTION_LABELS: Record<(typeof directions)[number], string> = {
  COMPANY_FROM_VENDOR: "We retain from Vendor",
  CLIENT_FROM_COMPANY: "Client retains from us",
};

function toDateInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function RetentionForm({
  action,
  contracts,
  purchaseInvoices,
  salesInvoices,
  defaultValues,
}: {
  action: (prevState: RetentionFormState, formData: FormData) => Promise<RetentionFormState>;
  contracts: ContractOption[];
  purchaseInvoices: InvoiceOption[];
  salesInvoices: InvoiceOption[];
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [contractId, setContractId] = useState(defaultValues?.contractId ?? "");
  const [direction, setDirection] = useState(defaultValues?.direction ?? "COMPANY_FROM_VENDOR");
  const [linkedInvoiceId, setLinkedInvoiceId] = useState(defaultValues?.linkedInvoiceId ?? "");
  const [amount, setAmount] = useState(defaultValues?.amount ?? "");
  const [currency, setCurrency] = useState(defaultValues?.currency ?? "EUR");
  const [percent, setPercent] = useState(defaultValues?.percent ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "HELD");
  const [releaseDate, setReleaseDate] = useState(toDateInputValue(defaultValues?.releaseDate));

  const invoiceOptions = useMemo(() => {
    const source = direction === "COMPANY_FROM_VENDOR" ? purchaseInvoices : salesInvoices;
    return source.filter((i) => i.contractId === contractId);
  }, [direction, contractId, purchaseInvoices, salesInvoices]);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="contractId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Contract<span className="text-red-500"> *</span>
        </label>
        <select
          id="contractId"
          name="contractId"
          value={contractId}
          onChange={(e) => {
            setContractId(e.target.value);
            setLinkedInvoiceId("");
          }}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Select a contract…</option>
          {contracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.number} ({c.projectCode})
            </option>
          ))}
        </select>
        {state.errors?.contractId?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="direction" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Direction<span className="text-red-500"> *</span>
        </label>
        <select
          id="direction"
          name="direction"
          value={direction}
          onChange={(e) => {
            setDirection(e.target.value);
            setLinkedInvoiceId("");
          }}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {directions.map((d) => (
            <option key={d} value={d}>
              {DIRECTION_LABELS[d]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="linkedInvoiceId"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {direction === "COMPANY_FROM_VENDOR" ? "Purchase Invoice" : "Sales Invoice"} (optional)
        </label>
        <select
          id="linkedInvoiceId"
          name="linkedInvoiceId"
          value={linkedInvoiceId}
          onChange={(e) => setLinkedInvoiceId(e.target.value)}
          disabled={!contractId}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Not linked to a specific invoice</option>
          {invoiceOptions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.number} — {i.party}
            </option>
          ))}
        </select>
        {contractId && invoiceOptions.length === 0 && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            No {direction === "COMPANY_FROM_VENDOR" ? "purchase" : "sales"} invoices on this
            contract yet.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Amount<span className="text-red-500"> *</span>
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          {state.errors?.amount?.map((err) => (
            <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
              {err}
            </p>
          ))}
        </div>
        <div>
          <label htmlFor="currency" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Currency<span className="text-red-500"> *</span>
          </label>
          <select
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="percent" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Percent (optional)
        </label>
        <input
          id="percent"
          name="percent"
          type="number"
          step="0.01"
          value={percent ?? ""}
          onChange={(e) => setPercent(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {state.errors?.percent?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="releaseDate" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Release Date (optional)
          </label>
          <input
            id="releaseDate"
            name="releaseDate"
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <Link
          href="/retentions"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

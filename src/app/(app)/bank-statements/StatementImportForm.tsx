"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { StatementFormState } from "./actions";

const initialState: StatementFormState = {};

type BankAccountOption = { id: string; name: string; currency: string };

export function StatementImportForm({
  action,
  bankAccounts,
}: {
  action: (prevState: StatementFormState, formData: FormData) => Promise<StatementFormState>;
  bankAccounts: BankAccountOption[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <div>
        <label
          htmlFor="bankAccountId"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Bank Account<span className="text-red-500"> *</span>
        </label>
        <select
          id="bankAccountId"
          name="bankAccountId"
          required
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Select a bank account…</option>
          {bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.currency})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="file"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          CSV File<span className="text-red-500"> *</span>
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900"
        />
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          Expected columns: <code>date</code> (YYYY-MM-DD), <code>description</code>,{" "}
          <code>amount</code> (positive = money in, negative = money out).
        </p>
      </div>

      <div>
        <label
          htmlFor="fileName"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Name (optional, defaults to the uploaded file name)
        </label>
        <input
          id="fileName"
          name="fileName"
          type="text"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="periodStart"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Period Start (optional)
          </label>
          <input
            id="periodStart"
            name="periodStart"
            type="date"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label
            htmlFor="periodEnd"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Period End (optional)
          </label>
          <input
            id="periodEnd"
            name="periodEnd"
            type="date"
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
          {pending ? "Importing…" : "Import"}
        </button>
        <Link
          href="/bank-statements"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { StatementFormState } from "./actions";

const initialState: StatementFormState = {};

function toDateInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function StatementEditForm({
  action,
  defaultValues,
}: {
  action: (prevState: StatementFormState, formData: FormData) => Promise<StatementFormState>;
  defaultValues: {
    fileName: string;
    periodStart: Date | string | null;
    periodEnd: Date | string | null;
  };
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
          htmlFor="fileName"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Name<span className="text-red-500"> *</span>
        </label>
        <input
          id="fileName"
          name="fileName"
          type="text"
          defaultValue={defaultValues.fileName}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="periodStart"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Period Start
          </label>
          <input
            id="periodStart"
            name="periodStart"
            type="date"
            defaultValue={toDateInputValue(defaultValues.periodStart)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div>
          <label
            htmlFor="periodEnd"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Period End
          </label>
          <input
            id="periodEnd"
            name="periodEnd"
            type="date"
            defaultValue={toDateInputValue(defaultValues.periodEnd)}
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
          href="/bank-statements"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

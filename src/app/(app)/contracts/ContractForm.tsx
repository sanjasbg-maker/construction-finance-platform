"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ContractFormState } from "./actions";
import { contractStatuses, currencies } from "./schema";

const initialState: ContractFormState = {};

type ProjectOption = { id: string; name: string; code: string };

type DefaultValues = {
  number?: string;
  date?: Date | string | null;
  projectId?: string;
  value?: string;
  currency?: string;
  retentionPercent?: string | null;
  status?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

type FieldValues = {
  number: string;
  date: string;
  projectId: string;
  value: string;
  currency: string;
  retentionPercent: string;
  status: string;
  startDate: string;
  endDate: string;
};

function toDateInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toFieldValues(v?: DefaultValues): FieldValues {
  return {
    number: v?.number ?? "",
    date: toDateInputValue(v?.date),
    projectId: v?.projectId ?? "",
    value: v?.value ?? "",
    currency: v?.currency ?? "EUR",
    retentionPercent: v?.retentionPercent ?? "",
    status: v?.status ?? "DRAFT",
    startDate: toDateInputValue(v?.startDate),
    endDate: toDateInputValue(v?.endDate),
  };
}

export function ContractForm({
  action,
  projects,
  defaultValues,
}: {
  action: (prevState: ContractFormState, formData: FormData) => Promise<ContractFormState>;
  projects: ProjectOption[];
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<FieldValues>(() => toFieldValues(defaultValues));

  function updateField(name: keyof FieldValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <Field
        label="Number"
        name="number"
        value={values.number}
        onChange={(v) => updateField("number", v)}
        errors={state.errors?.number}
        required
      />

      <div>
        <label
          htmlFor="projectId"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Project<span className="text-red-500"> *</span>
        </label>
        <select
          id="projectId"
          name="projectId"
          value={values.projectId}
          onChange={(e) => updateField("projectId", e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Select a project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
        {state.errors?.projectId?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

      <Field
        label="Contract Date"
        name="date"
        type="date"
        value={values.date}
        onChange={(v) => updateField("date", v)}
        errors={state.errors?.date}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Value"
          name="value"
          type="number"
          value={values.value}
          onChange={(v) => updateField("value", v)}
          errors={state.errors?.value}
          required
        />
        <div>
          <label
            htmlFor="currency"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Currency<span className="text-red-500"> *</span>
          </label>
          <select
            id="currency"
            name="currency"
            value={values.currency}
            onChange={(e) => updateField("currency", e.target.value)}
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

      <Field
        label="Retention %"
        name="retentionPercent"
        type="number"
        value={values.retentionPercent}
        onChange={(v) => updateField("retentionPercent", v)}
        errors={state.errors?.retentionPercent}
      />

      <div>
        <label
          htmlFor="status"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          value={values.status}
          onChange={(e) => updateField("status", e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {contractStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Start Date"
          name="startDate"
          type="date"
          value={values.startDate}
          onChange={(v) => updateField("startDate", v)}
          errors={state.errors?.startDate}
        />
        <Field
          label="End Date"
          name="endDate"
          type="date"
          value={values.endDate}
          onChange={(v) => updateField("endDate", v)}
          errors={state.errors?.endDate}
        />
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
          href="/contracts"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  errors,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {errors?.map((err) => (
        <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {err}
        </p>
      ))}
    </div>
  );
}

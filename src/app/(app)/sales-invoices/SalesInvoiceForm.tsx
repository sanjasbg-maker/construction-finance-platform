"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { SalesInvoiceFormState } from "./actions";
import { currencies, salesInvoiceStatuses } from "./schema";

const initialState: SalesInvoiceFormState = {};

type ClientOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; code: string };
type ContractOption = { id: string; number: string; projectId: string };
type SituationOption = { id: string; number: string };

type DefaultValues = {
  number?: string;
  clientId?: string;
  projectId?: string;
  contractId?: string | null;
  situationId?: string | null;
  amount?: string;
  currency?: string;
  issueDate?: Date | string | null;
  dueDate?: Date | string | null;
  status?: string;
};

type FieldValues = {
  number: string;
  clientId: string;
  projectId: string;
  contractId: string;
  situationId: string;
  amount: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: string;
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
    clientId: v?.clientId ?? "",
    projectId: v?.projectId ?? "",
    contractId: v?.contractId ?? "",
    situationId: v?.situationId ?? "",
    amount: v?.amount ?? "",
    currency: v?.currency ?? "EUR",
    issueDate: toDateInputValue(v?.issueDate),
    dueDate: toDateInputValue(v?.dueDate),
    status: v?.status ?? "DRAFT",
  };
}

export function SalesInvoiceForm({
  action,
  clients,
  projects,
  contracts,
  situations,
  defaultValues,
}: {
  action: (
    prevState: SalesInvoiceFormState,
    formData: FormData,
  ) => Promise<SalesInvoiceFormState>;
  clients: ClientOption[];
  projects: ProjectOption[];
  contracts: ContractOption[];
  situations: SituationOption[];
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<FieldValues>(() => toFieldValues(defaultValues));

  function updateField(name: keyof FieldValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleProjectChange(projectId: string) {
    setValues((prev) => {
      const stillValid = contracts.some(
        (c) => c.id === prev.contractId && c.projectId === projectId,
      );
      return { ...prev, projectId, contractId: stillValid ? prev.contractId : "" };
    });
  }

  const availableContracts = contracts.filter((c) => c.projectId === values.projectId);

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
          htmlFor="clientId"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Client<span className="text-red-500"> *</span>
        </label>
        <select
          id="clientId"
          name="clientId"
          value={values.clientId}
          onChange={(e) => updateField("clientId", e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {state.errors?.clientId?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
      </div>

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
          onChange={(e) => handleProjectChange(e.target.value)}
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

      <div>
        <label
          htmlFor="contractId"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Contract
        </label>
        <select
          id="contractId"
          name="contractId"
          value={values.contractId}
          disabled={!values.projectId}
          onChange={(e) => updateField("contractId", e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No contract</option>
          {availableContracts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.number}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="situationId"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Situation
        </label>
        <select
          id="situationId"
          name="situationId"
          value={values.situationId}
          onChange={(e) => updateField("situationId", e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">No situation (ad-hoc invoice)</option>
          {situations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}
            </option>
          ))}
        </select>
        {situations.length === 0 && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            No approved situations yet — this invoice will be recorded as ad-hoc.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Amount"
          name="amount"
          type="number"
          value={values.amount}
          onChange={(v) => updateField("amount", v)}
          errors={state.errors?.amount}
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

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Issue Date"
          name="issueDate"
          type="date"
          value={values.issueDate}
          onChange={(v) => updateField("issueDate", v)}
          errors={state.errors?.issueDate}
          required
        />
        <Field
          label="Due Date"
          name="dueDate"
          type="date"
          value={values.dueDate}
          onChange={(v) => updateField("dueDate", v)}
          errors={state.errors?.dueDate}
          required
        />
      </div>

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
          {salesInvoiceStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
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
          href="/sales-invoices"
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

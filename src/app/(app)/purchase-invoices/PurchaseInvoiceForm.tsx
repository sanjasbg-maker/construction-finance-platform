"use client";

import { useActionState, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import type { PurchaseInvoiceFormState } from "./actions";
import { currencies } from "./schema";
import { extractPurchaseInvoice } from "./extract-actions";

const initialState: PurchaseInvoiceFormState = {};

type VendorOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; code: string };
type ContractOption = { id: string; number: string; projectId: string };

type DefaultValues = {
  number?: string;
  sefNumber?: string | null;
  vendorId?: string;
  projectId?: string;
  contractId?: string | null;
  amount?: string;
  currency?: string;
  issueDate?: Date | string | null;
  dueDate?: Date | string | null;
};

type FieldValues = {
  number: string;
  sefNumber: string;
  vendorId: string;
  projectId: string;
  contractId: string;
  amount: string;
  currency: string;
  issueDate: string;
  dueDate: string;
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
    sefNumber: v?.sefNumber ?? "",
    vendorId: v?.vendorId ?? "",
    projectId: v?.projectId ?? "",
    contractId: v?.contractId ?? "",
    amount: v?.amount ?? "",
    currency: v?.currency ?? "EUR",
    issueDate: toDateInputValue(v?.issueDate),
    dueDate: toDateInputValue(v?.dueDate),
  };
}

function matchVendorId(vendorName: string | null, vendors: VendorOption[]): string {
  if (!vendorName) return "";
  const normalized = vendorName.trim().toLowerCase();
  const exact = vendors.find((v) => v.name.trim().toLowerCase() === normalized);
  if (exact) return exact.id;
  const partial = vendors.find(
    (v) => v.name.toLowerCase().includes(normalized) || normalized.includes(v.name.toLowerCase()),
  );
  return partial?.id ?? "";
}

export function PurchaseInvoiceForm({
  action,
  vendors,
  projects,
  contracts,
  defaultValues,
  showImport = false,
}: {
  action: (
    prevState: PurchaseInvoiceFormState,
    formData: FormData,
  ) => Promise<PurchaseInvoiceFormState>;
  vendors: VendorOption[];
  projects: ProjectOption[];
  contracts: ContractOption[];
  defaultValues?: DefaultValues;
  showImport?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<FieldValues>(() => toFieldValues(defaultValues));
  const [isExtracting, startExtracting] = useTransition();
  const [importError, setImportError] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

  function updateField(name: keyof FieldValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later
    if (!file) return;

    setImportError(null);
    setImportNote(null);
    const invoiceData = new FormData();
    invoiceData.set("invoice", file);

    startExtracting(async () => {
      const result = await extractPurchaseInvoice(invoiceData);
      if (!result.success) {
        setImportError(result.error);
        return;
      }
      const { data } = result;
      const matchedVendorId = matchVendorId(data.vendorName, vendors);
      if (data.vendorName && !matchedVendorId) {
        setImportNote(
          `Extracted vendor "${data.vendorName}" doesn't match any existing Vendor — please select one manually (or add it first).`,
        );
      }

      setValues((prev) => ({
        ...prev,
        number: data.invoiceNumber ?? prev.number,
        sefNumber: data.sefNumber ?? prev.sefNumber,
        vendorId: matchedVendorId || prev.vendorId,
        amount: data.amount ?? prev.amount,
        currency: data.currency ?? prev.currency,
        issueDate: data.issueDate ?? prev.issueDate,
        dueDate: data.dueDate ?? prev.dueDate,
      }));
    });
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
      {showImport && (
        <div className="rounded-md border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Import from invoice PDF (optional)
          </label>
          <input
            type="file"
            accept="application/pdf"
            disabled={isExtracting}
            onChange={handleFileChange}
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white disabled:opacity-50 dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900"
          />
          {isExtracting && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Reading invoice…</p>
          )}
          {importError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{importError}</p>
          )}
          {importNote && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{importNote}</p>
          )}
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Fills in Number, SEF Number, Amount, Currency, and dates, and tries to match the
            Vendor by name. Project and Contract are never guessed — a PDF has no way to know
            which internal project it belongs to, so pick those yourself. Nothing is saved
            until you click Save.
          </p>
        </div>
      )}

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
      <Field
        label="SEF Number"
        name="sefNumber"
        value={values.sefNumber}
        onChange={(v) => updateField("sefNumber", v)}
        errors={state.errors?.sefNumber}
      />

      <div>
        <label
          htmlFor="vendorId"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Vendor<span className="text-red-500"> *</span>
        </label>
        <select
          id="vendorId"
          name="vendorId"
          value={values.vendorId}
          onChange={(e) => updateField("vendorId", e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Select a vendor…</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        {state.errors?.vendorId?.map((err) => (
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
        {values.projectId && availableContracts.length === 0 && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            This project has no contracts yet.
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

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <Link
          href="/purchase-invoices"
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

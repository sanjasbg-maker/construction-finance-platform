"use client";

import { useActionState, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import type { VendorFormState } from "./actions";
import { extractVendorFromInvoice } from "./extract-actions";
import { currencies } from "./schema";

const initialState: VendorFormState = {};

type DefaultValues = {
  name?: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  paymentTerms?: string | null;
  openingBalance?: string | null;
  openingBalanceCurrency?: string | null;
};

type FieldValues = {
  name: string;
  taxId: string;
  email: string;
  phone: string;
  paymentTerms: string;
  openingBalance: string;
  openingBalanceCurrency: string;
};

function toFieldValues(v?: DefaultValues): FieldValues {
  return {
    name: v?.name ?? "",
    taxId: v?.taxId ?? "",
    email: v?.email ?? "",
    phone: v?.phone ?? "",
    paymentTerms: v?.paymentTerms ?? "",
    openingBalance: v?.openingBalance ?? "0",
    openingBalanceCurrency: v?.openingBalanceCurrency ?? "EUR",
  };
}

export function VendorForm({
  action,
  defaultValues,
  showImport = false,
}: {
  action: (prevState: VendorFormState, formData: FormData) => Promise<VendorFormState>;
  defaultValues?: DefaultValues;
  showImport?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<FieldValues>(() => toFieldValues(defaultValues));
  const [isExtracting, startExtracting] = useTransition();
  const [importError, setImportError] = useState<string | null>(null);

  function updateField(name: keyof FieldValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later
    if (!file) return;

    setImportError(null);
    const invoiceData = new FormData();
    invoiceData.set("invoice", file);

    startExtracting(async () => {
      const result = await extractVendorFromInvoice(invoiceData);
      if (!result.success) {
        setImportError(result.error);
        return;
      }
      setValues((prev) => ({
        ...prev,
        name: result.data.name ?? prev.name,
        taxId: result.data.taxId ?? prev.taxId,
        email: result.data.email ?? prev.email,
        phone: result.data.phone ?? prev.phone,
        paymentTerms: result.data.paymentTerms ?? prev.paymentTerms,
      }));
    });
  }

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
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Reading invoice…
            </p>
          )}
          {importError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{importError}</p>
          )}
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Fields below will be filled in for you to review — nothing is saved until you click Save.
          </p>
        </div>
      )}

      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <Field
        label="Name"
        name="name"
        value={values.name}
        onChange={(v) => updateField("name", v)}
        errors={state.errors?.name}
        required
      />
      <Field
        label="Tax ID"
        name="taxId"
        value={values.taxId}
        onChange={(v) => updateField("taxId", v)}
        errors={state.errors?.taxId}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        value={values.email}
        onChange={(v) => updateField("email", v)}
        errors={state.errors?.email}
      />
      <Field
        label="Phone"
        name="phone"
        value={values.phone}
        onChange={(v) => updateField("phone", v)}
        errors={state.errors?.phone}
      />
      <Field
        label="Payment Terms"
        name="paymentTerms"
        value={values.paymentTerms}
        onChange={(v) => updateField("paymentTerms", v)}
        errors={state.errors?.paymentTerms}
      />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Opening Balance"
          name="openingBalance"
          type="number"
          value={values.openingBalance}
          onChange={(v) => updateField("openingBalance", v)}
          errors={state.errors?.openingBalance}
        />
        <div>
          <label
            htmlFor="openingBalanceCurrency"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Currency
          </label>
          <select
            id="openingBalanceCurrency"
            name="openingBalanceCurrency"
            value={values.openingBalanceCurrency}
            onChange={(e) => updateField("openingBalanceCurrency", e.target.value)}
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
      <p className="-mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        Amount owed to this vendor carried over from a previous accounting system - not tied
        to a specific invoice.
      </p>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <Link
          href="/vendors"
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

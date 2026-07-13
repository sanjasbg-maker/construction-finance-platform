"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { PaymentFormState } from "./actions";
import { currencies, paymentPurposes, purposeLabels, type PaymentPurpose } from "./schema";

const initialState: PaymentFormState = {};

type VendorOption = { id: string; name: string };
type ClientOption = { id: string; name: string };
type BankAccountOption = { id: string; name: string; currency: string };

type FieldValues = {
  purpose: PaymentPurpose;
  vendorId: string;
  clientId: string;
  bankAccountId: string;
  amount: string;
  currency: string;
  date: string;
};

export type PaymentDefaultValues = {
  type: string;
  direction: string;
  vendorId?: string | null;
  clientId?: string | null;
  bankAccountId?: string;
  amount?: string;
  currency?: string;
  date?: Date | string | null;
};

function toDateInputValue(value?: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function purposeFromTypeAndDirection(type: string, direction: string): PaymentPurpose {
  if (type === "VENDOR_ADVANCE") return "VENDOR_ADVANCE";
  if (type === "CLIENT_ADVANCE") return "CLIENT_ADVANCE";
  return direction === "OUT" ? "PURCHASE_SETTLEMENT" : "SALES_SETTLEMENT";
}

function toFieldValues(v?: PaymentDefaultValues): FieldValues {
  return {
    purpose: v ? purposeFromTypeAndDirection(v.type, v.direction) : "VENDOR_ADVANCE",
    vendorId: v?.vendorId ?? "",
    clientId: v?.clientId ?? "",
    bankAccountId: v?.bankAccountId ?? "",
    amount: v?.amount ?? "",
    currency: v?.currency ?? "EUR",
    date: toDateInputValue(v?.date),
  };
}

export function PaymentForm({
  action,
  vendors,
  clients,
  bankAccounts,
  defaultValues,
}: {
  action: (prevState: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  vendors: VendorOption[];
  clients: ClientOption[];
  bankAccounts: BankAccountOption[];
  defaultValues?: PaymentDefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<FieldValues>(() => toFieldValues(defaultValues));

  function updateField<K extends keyof FieldValues>(name: K, value: FieldValues[K]) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <div>
        <label
          htmlFor="purpose"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Purpose<span className="text-red-500"> *</span>
        </label>
        <select
          id="purpose"
          name="purpose"
          value={values.purpose}
          onChange={(e) => updateField("purpose", e.target.value as PaymentPurpose)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {paymentPurposes.map((p) => (
            <option key={p} value={p}>
              {purposeLabels[p]}
            </option>
          ))}
        </select>
        {(values.purpose === "PURCHASE_SETTLEMENT" || values.purpose === "SALES_SETTLEMENT") && (
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            You&apos;ll pick which invoice(s) this settles on the next screen.
          </p>
        )}
      </div>

      {values.purpose === "VENDOR_ADVANCE" && (
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
      )}

      {values.purpose === "CLIENT_ADVANCE" && (
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
          value={values.bankAccountId}
          onChange={(e) => updateField("bankAccountId", e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="">Select a bank account…</option>
          {bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.currency})
            </option>
          ))}
        </select>
        {state.errors?.bankAccountId?.map((err) => (
          <p key={err} className="mt-1 text-xs text-red-600 dark:text-red-400">
            {err}
          </p>
        ))}
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

      <Field
        label="Date"
        name="date"
        type="date"
        value={values.date}
        onChange={(v) => updateField("date", v)}
        errors={state.errors?.date}
        required
      />

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <Link
          href="/treasury"
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

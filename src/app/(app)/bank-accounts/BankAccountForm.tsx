"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { BankAccountFormState } from "./actions";
import { currencies } from "./schema";

const initialState: BankAccountFormState = {};

type DefaultValues = {
  name?: string;
  iban?: string | null;
  currency?: string;
  openingBalance?: string | null;
};

type FieldValues = {
  name: string;
  iban: string;
  currency: string;
  openingBalance: string;
};

function toFieldValues(v?: DefaultValues): FieldValues {
  return {
    name: v?.name ?? "",
    iban: v?.iban ?? "",
    currency: v?.currency ?? "EUR",
    openingBalance: v?.openingBalance ?? "0",
  };
}

export function BankAccountForm({
  action,
  defaultValues,
}: {
  action: (prevState: BankAccountFormState, formData: FormData) => Promise<BankAccountFormState>;
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
        label="Name"
        name="name"
        value={values.name}
        onChange={(v) => updateField("name", v)}
        errors={state.errors?.name}
        required
      />
      <Field
        label="IBAN"
        name="iban"
        value={values.iban}
        onChange={(v) => updateField("iban", v)}
        errors={state.errors?.iban}
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

      <Field
        label="Opening Balance"
        name="openingBalance"
        type="number"
        value={values.openingBalance}
        onChange={(v) => updateField("openingBalance", v)}
        errors={state.errors?.openingBalance}
      />
      <p className="-mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        Balance as of when this account started being tracked here (e.g. migrating from a
        previous accounting system) - Cash Position adds this to the net of all recorded
        payments.
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
          href="/bank-accounts"
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

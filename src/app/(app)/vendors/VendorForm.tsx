"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { VendorFormState } from "./actions";

const initialState: VendorFormState = {};

type DefaultValues = {
  name?: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  paymentTerms?: string | null;
};

export function VendorForm({
  action,
  defaultValues,
}: {
  action: (prevState: VendorFormState, formData: FormData) => Promise<VendorFormState>;
  defaultValues?: DefaultValues;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = state.values ?? {
    name: defaultValues?.name ?? "",
    taxId: defaultValues?.taxId ?? "",
    email: defaultValues?.email ?? "",
    phone: defaultValues?.phone ?? "",
    paymentTerms: defaultValues?.paymentTerms ?? "",
  };

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
        defaultValue={values.name ?? ""}
        errors={state.errors?.name}
        required
      />
      <Field
        label="Tax ID"
        name="taxId"
        defaultValue={values.taxId ?? ""}
        errors={state.errors?.taxId}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        defaultValue={values.email ?? ""}
        errors={state.errors?.email}
      />
      <Field
        label="Phone"
        name="phone"
        defaultValue={values.phone ?? ""}
        errors={state.errors?.phone}
      />
      <Field
        label="Payment Terms"
        name="paymentTerms"
        defaultValue={values.paymentTerms ?? ""}
        errors={state.errors?.paymentTerms}
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
  defaultValue,
  errors,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
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
        defaultValue={defaultValue}
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

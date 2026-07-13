"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ProjectFormState } from "./actions";
import { projectStatuses } from "./schema";

const initialState: ProjectFormState = {};

type ClientOption = { id: string; name: string };

type DefaultValues = {
  name?: string;
  code?: string;
  clientId?: string;
  status?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

type FieldValues = {
  name: string;
  code: string;
  clientId: string;
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
    name: v?.name ?? "",
    code: v?.code ?? "",
    clientId: v?.clientId ?? "",
    status: v?.status ?? "ACTIVE",
    startDate: toDateInputValue(v?.startDate),
    endDate: toDateInputValue(v?.endDate),
  };
}

export function ProjectForm({
  mode,
  action,
  clients,
  defaultValues,
}: {
  mode: "create" | "edit";
  action: (prevState: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  clients: ClientOption[];
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

      {mode === "create" ? (
        <Field
          label="Code"
          name="code"
          value={values.code}
          onChange={(v) => updateField("code", v)}
          errors={state.errors?.code}
          required
        />
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Code
          </label>
          <input
            value={values.code}
            disabled
            className="w-full cursor-not-allowed rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500"
          />
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Project code is immutable once created.
          </p>
        </div>
      )}

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
          {projectStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
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
          href="/projects"
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

"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { UserFormState } from "./actions";
import { ROLES } from "./schema";

const initialState: UserFormState = {};

export function UserForm({
  action,
  defaultValues,
}: {
  action: (prevState: UserFormState, formData: FormData) => Promise<UserFormState>;
  defaultValues?: { name?: string; email?: string; role?: string };
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = state.values ?? defaultValues ?? {};

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name<span className="text-red-500"> *</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={values.name}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {state.errors?.name && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email<span className="text-red-500"> *</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={values.email}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {state.errors?.email && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="role" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Role<span className="text-red-500"> *</span>
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue={values.role ?? "VIEWER"}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>
        {state.errors?.role && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.errors.role[0]}</p>
        )}
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
          href="/administration"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { DocumentFormState } from "./actions";
import { CATEGORIES, LINK_TYPES, type LinkType } from "./schema";
import type { LinkOption } from "./link-options";

const initialState: DocumentFormState = {};

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  NONE: "Not linked",
  PROJECT: "Project",
  CONTRACT: "Contract",
  PURCHASE_INVOICE: "Purchase Invoice",
  SALES_INVOICE: "Sales Invoice",
  BANK_STATEMENT: "Bank Statement",
};

export function DocumentForm({
  action,
  requireFile,
  linkOptions,
  defaultValues,
  cancelHref = "/documents",
}: {
  action: (prevState: DocumentFormState, formData: FormData) => Promise<DocumentFormState>;
  requireFile: boolean;
  linkOptions: LinkOption[];
  defaultValues?: { category?: string; linkType?: LinkType; linkId?: string; fileName?: string };
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [linkType, setLinkType] = useState<LinkType>(defaultValues?.linkType ?? "NONE");
  const filteredOptions = linkOptions.filter((o) => o.type === linkType);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {state.message && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}

      {defaultValues?.fileName && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          File:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-50">
            {defaultValues.fileName}
          </span>{" "}
          (the file itself can&apos;t be replaced — upload a new document instead)
        </p>
      )}

      {requireFile && (
        <div>
          <label htmlFor="file" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            File<span className="text-red-500"> *</span>
          </label>
          <input
            id="file"
            name="file"
            type="file"
            required
            className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900"
          />
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">Max 20MB.</p>
        </div>
      )}

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Category<span className="text-red-500"> *</span>
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={defaultValues?.category ?? ""}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          <option value="" disabled>
            Select a category…
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace("_", " ")}
            </option>
          ))}
        </select>
        {state.errors?.category && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.errors.category[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="linkType" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Link to
        </label>
        <select
          id="linkType"
          name="linkType"
          value={linkType}
          onChange={(e) => setLinkType(e.target.value as LinkType)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        >
          {LINK_TYPES.map((type) => (
            <option key={type} value={type}>
              {LINK_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {linkType !== "NONE" && (
        <div>
          <label htmlFor="linkId" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {LINK_TYPE_LABELS[linkType]}
            <span className="text-red-500"> *</span>
          </label>
          <select
            id="linkId"
            name="linkId"
            required
            defaultValue={defaultValues?.linkId ?? ""}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="" disabled>
              Select…
            </option>
            {filteredOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {filteredOptions.length === 0 && (
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">No records of this type yet.</p>
          )}
          {state.errors?.linkId && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{state.errors.linkId[0]}</p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <Link
          href={cancelHref}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

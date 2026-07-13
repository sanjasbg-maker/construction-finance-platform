"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignProjectManager, unassignProjectManager } from "./pm-actions";

type PmOption = { id: string; name: string };

export function PmAssignment({
  projectId,
  currentPm,
  options,
  canManage,
}: {
  projectId: string;
  currentPm: { id: string; name: string } | null;
  options: PmOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {currentPm ? currentPm.name : "Unassigned"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        defaultValue={currentPm?.id ?? ""}
        disabled={isPending}
        onChange={(e) => {
          const value = e.target.value;
          setError(null);
          startTransition(async () => {
            try {
              if (value) {
                await assignProjectManager(projectId, value);
              } else {
                await unassignProjectManager(projectId);
              }
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Something went wrong.");
            }
          });
        }}
        className="w-full max-w-xs rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      >
        <option value="">— Unassigned —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

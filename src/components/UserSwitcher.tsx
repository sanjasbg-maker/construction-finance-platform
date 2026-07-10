"use client";

import { useTransition } from "react";
import { setActiveUser } from "@/app/actions/user";

type UserOption = { id: string; name: string; role: string };

export function UserSwitcher({
  users,
  activeUserId,
}: {
  users: UserOption[];
  activeUserId?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="px-3 py-2">
      <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">
        Acting as
      </label>
      <select
        defaultValue={activeUserId}
        disabled={isPending}
        onChange={(e) => {
          const userId = e.target.value;
          startTransition(() => {
            setActiveUser(userId);
          });
        }}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      >
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.role})
          </option>
        ))}
      </select>
    </div>
  );
}

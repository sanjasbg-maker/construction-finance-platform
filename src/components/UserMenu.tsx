"use client";

import Link from "next/link";
import { useTransition } from "react";
import { logout } from "@/app/actions/user";

export function UserMenu({ currentUser }: { currentUser: { name: string; role: string } }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{currentUser.name}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{currentUser.role}</p>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <Link href="/account" className="text-zinc-600 hover:underline dark:text-zinc-400">
          Change Password
        </Link>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => logout())}
          className="text-zinc-600 hover:underline disabled:opacity-50 dark:text-zinc-400"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

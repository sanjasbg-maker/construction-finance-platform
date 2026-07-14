"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { modules } from "@/lib/modules";
import { UserMenu } from "@/components/UserMenu";

export function Sidebar({
  currentUser,
}: {
  currentUser: { name: string; role: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="px-4 py-5">
        <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Construction Finance Platform
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {modules.map((m) => {
          const href = `/${m.slug}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={m.slug}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              <span className="font-mono text-xs text-zinc-400">{m.order}</span>
              {m.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <UserMenu currentUser={currentUser} />
      </div>
    </aside>
  );
}

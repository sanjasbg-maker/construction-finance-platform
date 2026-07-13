import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { DeleteButton } from "@/components/DeleteButton";
import { removeUser } from "./actions";

export default async function AdministrationPage() {
  const [users, currentUser] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getCurrentUser(),
  ]);
  const isAdmin = currentUser?.role === "ADMIN";
  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Administration</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Users, roles, and system configuration.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/administration/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add User
          </Link>
        )}
      </div>

      {!isAdmin && (
        <p className="rounded-md border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Only Administrators can add, edit, or remove users.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              {isAdmin && <th className="px-4 py-3 font-medium" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {users.map((u) => {
              const isLastAdmin = u.role === "ADMIN" && adminCount === 1;
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{u.role.replace("_", " ")}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/administration/${u.id}/edit`}
                          className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                        >
                          Edit
                        </Link>
                        {!isSelf && !isLastAdmin && (
                          <DeleteButton
                            action={removeUser.bind(null, u.id)}
                            confirmMessage={`Delete user "${u.name}"? This can't be undone from the UI yet.`}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

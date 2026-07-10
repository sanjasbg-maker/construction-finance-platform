import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listUsers } from "@/lib/current-user";
import { DeleteButton } from "@/components/DeleteButton";
import { removeVendor } from "./actions";

export default async function VendorsPage() {
  const [vendors, users] = await Promise.all([
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    listUsers(),
  ]);

  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Vendors
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Vendor master data: contacts, tax IDs, and payment terms.
          </p>
        </div>
        <Link
          href="/vendors/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add Vendor
        </Link>
      </div>

      {vendors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          No vendors yet.{" "}
          <Link href="/vendors/new" className="underline">
            Add the first one
          </Link>
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Tax ID</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Payment Terms</th>
                <th className="px-4 py-3 font-medium">Created by</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {vendor.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {vendor.taxId ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {vendor.email ?? vendor.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {vendor.paymentTerms ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {(vendor.createdBy && userNameById.get(vendor.createdBy)) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/vendors/${vendor.id}/edit`}
                        className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        action={removeVendor.bind(null, vendor.id)}
                        confirmMessage={`Delete ${vendor.name}? This can't be undone from the UI yet.`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

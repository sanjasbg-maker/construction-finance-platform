import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "../PaymentForm";
import { createPayment } from "../actions";

export default async function NewPaymentPage() {
  const [bankAccounts, vendors, clients] = await Promise.all([
    prisma.bankAccount.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
    }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Add Payment
      </h1>
      {bankAccounts.length === 0 ? (
        <p className="max-w-lg rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          A payment needs a bank account. Please{" "}
          <Link href="/bank-accounts/new" className="underline">
            add a bank account
          </Link>{" "}
          first.
        </p>
      ) : (
        <PaymentForm
          action={createPayment}
          vendors={vendors}
          clients={clients}
          bankAccounts={bankAccounts}
        />
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "../../PaymentForm";
import { updatePayment } from "../../actions";

export default async function EditPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [payment, bankAccounts, vendors, clients] = await Promise.all([
    prisma.payment.findUnique({ where: { id }, include: { allocations: true } }),
    prisma.bankAccount.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
    }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!payment) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Edit Payment
      </h1>
      {payment.allocations.length > 0 ? (
        <p className="max-w-lg rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          This payment already has allocations and can no longer be edited.{" "}
          <Link href={`/treasury/${payment.id}`} className="underline">
            View payment
          </Link>
          .
        </p>
      ) : (
        <PaymentForm
          action={updatePayment.bind(null, id)}
          vendors={vendors}
          clients={clients}
          bankAccounts={bankAccounts}
          defaultValues={{
            type: payment.type,
            direction: payment.direction,
            vendorId: payment.vendorId,
            clientId: payment.clientId,
            bankAccountId: payment.bankAccountId,
            amount: payment.amount.toString(),
            currency: payment.currency,
            date: payment.date,
          }}
        />
      )}
    </div>
  );
}
